<?php
/**
 * Mirrorly License Manager
 *
 * Handles license validation and management
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Mirrorly_License {

	/**
	 * License types
	 */
	const LICENSE_FREE        = 'free';
	const LICENSE_PRO_BASIC   = 'pro_basic';
	const LICENSE_PRO_PREMIUM = 'pro_premium';

	/**
	 * API Client instance
	 */
	private $api_client;

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->api_client = new Mirrorly_API_Client();

		add_action( 'init', array( $this, 'init' ) );
		add_action( 'wp_loaded', array( $this, 'check_license_status' ) );

		// Schedule daily license check
		if ( ! wp_next_scheduled( 'mirrorly_daily_license_check' ) ) {
			wp_schedule_event( time(), 'daily', 'mirrorly_daily_license_check' );
		}

		add_action( 'mirrorly_daily_license_check', array( $this, 'validate_current_license' ) );
	}

	/**
	 * Initialize license manager
	 */
	public function init() {
		// Auto-register free license if no license exists
		if ( ! $this->has_license() ) {
			$this->register_free_license();
		}
	}

	/**
	 * Check if plugin has any license
	 *
	 * @return bool
	 */
	public function has_license() {
		$options = get_option( 'mirrorly_options', array() );
		return ! empty( $options['license_key'] ) || ! empty( $options['api_key'] );
	}

	/**
	 * Get current license type
	 *
	 * @return string
	 */
	public function get_license_type() {
		$options = get_option( 'mirrorly_options', array() );
		return isset( $options['license_type'] ) ? $options['license_type'] : self::LICENSE_FREE;
	}

	/**
	 * Get current license key
	 *
	 * @return string
	 */
	public function get_license_key() {
		$options = get_option( 'mirrorly_options', array() );
		return isset( $options['license_key'] ) ? $options['license_key'] : '';
	}

	/**
	 * Check if current license is PRO
	 *
	 * @return bool
	 */
	public function is_pro() {
		$license_type = $this->get_license_type();
		return in_array( $license_type, array( self::LICENSE_PRO_BASIC, self::LICENSE_PRO_PREMIUM ) );
	}

	/**
	 * Check if current license is FREE
	 *
	 * @return bool
	 */
	public function is_free() {
		return $this->get_license_type() === self::LICENSE_FREE;
	}

	/**
	 * Register free license
	 *
	 * @return bool|WP_Error
	 */
	public function register_free_license() {
		$response = $this->api_client->register_free_license();

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		// Update options with free license data
		$options                 = get_option( 'mirrorly_options', array() );
		$options['license_type'] = self::LICENSE_FREE;
		$options['api_key']      = isset( $response['apiKey'] ) ? $response['apiKey'] : '';
		$options['license_key']  = isset( $response['licenseKey'] ) ? $response['licenseKey'] : '';
		$options['max_products'] = isset( $response['limits']['maxProducts'] ) ? $response['limits']['maxProducts'] : 3;

		update_option( 'mirrorly_options', $options );

		// Update API client with new key
		$this->api_client->set_api_key( $options['api_key'] );

		do_action( 'mirrorly_free_license_registered', $response );

		return true;
	}

	/**
	 * Register PRO license
	 *
	 * @param string $license_key PRO license key
	 * @return bool|WP_Error
	 */
	public function register_pro_license( $license_key ) {
		if ( empty( $license_key ) ) {
			return new WP_Error( 'empty_license_key', __( 'La clave de licencia no puede estar vacía', 'mirrorly' ) );
		}

		$response = $this->api_client->register_pro_license( $license_key );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		// Update options with PRO license data
		$options                 = get_option( 'mirrorly_options', array() );
		$options['license_type'] = isset( $response['licenseType'] ) ? $response['licenseType'] : self::LICENSE_PRO_BASIC;
		$options['license_key']  = $license_key;
		$options['api_key']      = isset( $response['apiKey'] ) ? $response['apiKey'] : '';
		$options['max_products'] = isset( $response['limits']['maxProducts'] ) ? $response['limits']['maxProducts'] : -1;

		update_option( 'mirrorly_options', $options );

		// Update API client with new key
		$this->api_client->set_api_key( $options['api_key'] );

		// Clear any cached data
		$this->api_client->clear_cache();

		do_action( 'mirrorly_pro_license_registered', $response );

		return true;
	}

	/**
	 * Validate current license
	 *
	 * @return bool|WP_Error
	 */
	public function validate_current_license() {
		$license_key = $this->get_license_key();

		if ( empty( $license_key ) ) {
			return new WP_Error( 'no_license_key', __( 'No hay clave de licencia configurada', 'mirrorly' ) );
		}

		$response = $this->api_client->validate_license( $license_key );

		if ( is_wp_error( $response ) ) {
			// If validation fails, degrade to free
			$this->degrade_to_free();
			return $response;
		}

		// Update license status based on validation
		if ( isset( $response['valid'] ) && $response['valid'] ) {
			$options = get_option( 'mirrorly_options', array() );

			if ( isset( $response['licenseType'] ) ) {
				$options['license_type'] = $response['licenseType'];
			}

			if ( isset( $response['limits']['maxProducts'] ) ) {
				$options['max_products'] = $response['limits']['maxProducts'];
			}

			update_option( 'mirrorly_options', $options );

			do_action( 'mirrorly_license_validated', $response );

			return true;
		} else {
			// License is invalid, degrade to free
			$this->degrade_to_free();
			return new WP_Error( 'invalid_license', __( 'La licencia no es válida o ha expirado', 'mirrorly' ) );
		}
	}

	/**
	 * Degrade license to free
	 */
	public function degrade_to_free() {
		$options                 = get_option( 'mirrorly_options', array() );
		$options['license_type'] = self::LICENSE_FREE;
		$options['max_products'] = 3;

		// Keep API key but clear license key
		$options['license_key'] = '';

		update_option( 'mirrorly_options', $options );

		// Clear cache
		$this->api_client->clear_cache();

		do_action( 'mirrorly_license_degraded_to_free' );

		// Show admin notice
		add_action( 'admin_notices', array( $this, 'show_license_degraded_notice' ) );
	}

	/**
	 * Show license degraded notice
	 */
	public function show_license_degraded_notice() {
		if ( current_user_can( 'manage_options' ) ) {
			echo '<div class="notice notice-warning is-dismissible">';
			echo '<p><strong>' . __( 'Mirrorly:', 'mirrorly' ) . '</strong> ' . __( 'Tu licencia PRO ha expirado o no es válida. El plugin ha sido degradado a la versión FREE.', 'mirrorly' ) . '</p>';
			echo '<p><a href="' . admin_url( 'admin.php?page=mirrorly-settings' ) . '" class="button">' . __( 'Renovar Licencia', 'mirrorly' ) . '</a></p>';
			echo '</div>';
		}
	}

	/**
	 * Check license status on page load
	 */
	public function check_license_status() {
		// Only check on admin pages and not too frequently
		if ( ! is_admin() || wp_doing_ajax() ) {
			return;
		}

		$last_check = get_transient( 'mirrorly_last_license_check' );
		if ( $last_check !== false ) {
			return; // Already checked recently
		}

		// Set transient to prevent frequent checks (check every 6 hours)
		set_transient( 'mirrorly_last_license_check', time(), 6 * HOUR_IN_SECONDS );

		// Validate license in background
		wp_schedule_single_event( time() + 10, 'mirrorly_background_license_check' );
	}

	/**
	 * Get license limits
	 *
	 * @return array
	 */
	public function get_license_limits() {
		$license_type = $this->get_license_type();

		$limits = array(
			self::LICENSE_FREE        => array(
				'monthly_generations' => 10,
				'rate_limit_seconds'  => 60,
				'max_products'        => 3,
				'custom_styling'      => false,
				'product_selection'   => false,
				'priority_support'    => false,
			),
			self::LICENSE_PRO_BASIC   => array(
				'monthly_generations' => 100,
				'rate_limit_seconds'  => 30,
				'max_products'        => -1, // unlimited
				'custom_styling'      => true,
				'product_selection'   => true,
				'priority_support'    => true,
			),
			self::LICENSE_PRO_PREMIUM => array(
				'monthly_generations' => 500,
				'rate_limit_seconds'  => 15,
				'max_products'        => -1, // unlimited
				'custom_styling'      => true,
				'product_selection'   => true,
				'priority_support'    => true,
			),
		);

		return isset( $limits[ $license_type ] ) ? $limits[ $license_type ] : $limits[ self::LICENSE_FREE ];
	}

	/**
	 * Check if feature is available for current license
	 *
	 * @param string $feature Feature name
	 * @return bool
	 */
	public function has_feature( $feature ) {
		$limits = $this->get_license_limits();
		return isset( $limits[ $feature ] ) ? $limits[ $feature ] : false;
	}

	/**
	 * Get remaining generations for current month
	 *
	 * @return int|string Returns number or 'unlimited'
	 */
	public function get_remaining_generations() {
		$usage_stats = $this->api_client->get_usage_stats();

		if ( is_wp_error( $usage_stats ) ) {
			return 0;
		}

		$limits        = $this->get_license_limits();
		$monthly_limit = $limits['monthly_generations'];
		$current_usage = isset( $usage_stats['currentUsage'] ) ? $usage_stats['currentUsage'] : 0;

		if ( $monthly_limit === -1 ) {
			return 'unlimited';
		}

		return max( 0, $monthly_limit - $current_usage );
	}

	/**
	 * Check if can generate more images
	 *
	 * @return bool
	 */
	public function can_generate() {
		$remaining = $this->get_remaining_generations();

		if ( $remaining === 'unlimited' ) {
			return true;
		}

		return $remaining > 0;
	}

	/**
	 * Get license status for display
	 *
	 * @return array
	 */
	public function get_license_status() {
		$license_type = $this->get_license_type();
		$limits       = $this->get_license_limits();
		$remaining    = $this->get_remaining_generations();

		$status = array(
			'type'                  => $license_type,
			'is_pro'                => $this->is_pro(),
			'limits'                => $limits,
			'remaining_generations' => $remaining,
			'can_generate'          => $this->can_generate(),
		);

		return $status;
	}
}
