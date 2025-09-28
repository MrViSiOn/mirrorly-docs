<?php
/**
 * Test helper functions
 */

class Mirrorly_Test_Helpers {

	/**
	 * Create a temporary image file for testing
	 */
	public static function create_temp_image( $width = 100, $height = 100, $format = 'jpeg' ) {
		$temp_dir = sys_get_temp_dir();
		$filename = 'mirrorly_test_' . uniqid() . '.' . ( $format === 'jpeg' ? 'jpg' : $format );
		$filepath = $temp_dir . '/' . $filename;

		// Create image
		$image = imagecreate( $width, $height );
		$white = imagecolorallocate( $image, 255, 255, 255 );
		$black = imagecolorallocate( $image, 0, 0, 0 );

		imagefill( $image, 0, 0, $white );
		imagestring( $image, 5, 10, 10, 'TEST', $black );

		// Save image
		switch ( $format ) {
			case 'jpeg':
				imagejpeg( $image, $filepath );
				break;
			case 'png':
				imagepng( $image, $filepath );
				break;
			case 'gif':
				imagegif( $image, $filepath );
				break;
		}

		imagedestroy( $image );

		return $filepath;
	}

	/**
	 * Clean up temporary files
	 */
	public static function cleanup_temp_files() {
		$temp_dir = sys_get_temp_dir();
		$files    = glob( $temp_dir . '/mirrorly_test_*' );

		foreach ( $files as $file ) {
			if ( is_file( $file ) ) {
				unlink( $file );
			}
		}
	}

	/**
	 * Mock $_FILES array for file upload testing
	 */
	public static function mock_file_upload( $filepath, $fieldname = 'user_image' ) {
		if ( ! file_exists( $filepath ) ) {
			return false;
		}

		$_FILES[ $fieldname ] = array(
			'name'     => basename( $filepath ),
			'type'     => mime_content_type( $filepath ),
			'tmp_name' => $filepath,
			'error'    => UPLOAD_ERR_OK,
			'size'     => filesize( $filepath ),
		);

		return true;
	}

	/**
	 * Create WooCommerce product with image
	 */
	public static function create_wc_product_with_image( $args = array() ) {
		// Create product
		$product_args = wp_parse_args(
			$args,
			array(
				'post_title'   => 'Test Product',
				'post_content' => 'Test product description',
				'post_status'  => 'publish',
				'post_type'    => 'product',
			)
		);

		$product_id = wp_insert_post( $product_args );

		// Set product type
		wp_set_object_terms( $product_id, 'simple', 'product_type' );

		// Add product meta
		update_post_meta( $product_id, '_price', '19.99' );
		update_post_meta( $product_id, '_regular_price', '19.99' );
		update_post_meta( $product_id, '_stock_status', 'instock' );

		// Create and attach image
		$image_path = self::create_temp_image();
		$upload_dir = wp_upload_dir();
		$new_path   = $upload_dir['path'] . '/' . basename( $image_path );
		copy( $image_path, $new_path );

		$attachment = array(
			'post_mime_type' => 'image/jpeg',
			'post_title'     => 'Product Image',
			'post_content'   => '',
			'post_status'    => 'inherit',
		);

		$attachment_id = wp_insert_attachment( $attachment, $new_path, $product_id );

		// Set as product image
		set_post_thumbnail( $product_id, $attachment_id );

		// Clean up temp file
		unlink( $image_path );

		return array(
			'product_id' => $product_id,
			'image_id'   => $attachment_id,
		);
	}

	/**
	 * Simulate AJAX request environment
	 */
	public static function setup_ajax_environment() {
		if ( ! defined( 'DOING_AJAX' ) ) {
			define( 'DOING_AJAX', true );
		}

		// Set up $_SERVER variables that WordPress expects
		$_SERVER['REQUEST_METHOD']        = 'POST';
		$_SERVER['HTTP_X_REQUESTED_WITH'] = 'XMLHttpRequest';
	}

	/**
	 * Parse JSON response from AJAX call
	 */
	public static function parse_ajax_response( $response ) {
		// Remove any extra output that might be added
		$response = trim( $response );

		// Find the JSON part (should be at the end)
		$json_start = strrpos( $response, '{' );
		if ( $json_start !== false ) {
			$json_part = substr( $response, $json_start );
			$data      = json_decode( $json_part, true );

			if ( json_last_error() === JSON_ERROR_NONE ) {
				return $data;
			}
		}

		// If no valid JSON found, return the raw response
		return array( 'raw_response' => $response );
	}

	/**
	 * Create admin user and set as current user
	 */
	public static function set_admin_user() {
		$user_id = wp_insert_user(
			array(
				'user_login' => 'admin_test_' . uniqid(),
				'user_email' => 'admin_test_' . uniqid() . '@example.com',
				'user_pass'  => 'password',
				'role'       => 'administrator',
			)
		);

		wp_set_current_user( $user_id );
		return $user_id;
	}

	/**
	 * Create customer user and set as current user
	 */
	public static function set_customer_user() {
		$user_id = wp_insert_user(
			array(
				'user_login' => 'customer_test_' . uniqid(),
				'user_email' => 'customer_test_' . uniqid() . '@example.com',
				'user_pass'  => 'password',
				'role'       => 'customer',
			)
		);

		wp_set_current_user( $user_id );
		return $user_id;
	}

	/**
	 * Reset WordPress environment
	 */
	public static function reset_wp_environment() {
		// Reset current user
		wp_set_current_user( 0 );

		// Clear $_POST and $_GET
		$_POST  = array();
		$_GET   = array();
		$_FILES = array();

		// Clear any output buffers
		while ( ob_get_level() ) {
			ob_end_clean();
		}
	}

	/**
	 * Assert that HTML contains specific elements
	 */
	public static function assert_html_contains( $html, $selector, $message = '' ) {
		// Simple check for basic selectors
		if ( strpos( $selector, '#' ) === 0 ) {
			// ID selector
			$id      = substr( $selector, 1 );
			$pattern = '/id=["\']' . preg_quote( $id, '/' ) . '["\']/';
			return preg_match( $pattern, $html ) > 0;
		} elseif ( strpos( $selector, '.' ) === 0 ) {
			// Class selector
			$class   = substr( $selector, 1 );
			$pattern = '/class=["\'][^"\']*' . preg_quote( $class, '/' ) . '[^"\']*["\']/';
			return preg_match( $pattern, $html ) > 0;
		} else {
			// Tag selector
			$pattern = '/<' . preg_quote( $selector, '/' ) . '[\s>]/';
			return preg_match( $pattern, $html ) > 0;
		}
	}

	/**
	 * Get plugin option with default
	 */
	public static function get_plugin_option( $key, $default = null ) {
		$options = get_option( 'mirrorly_options', array() );
		return isset( $options[ $key ] ) ? $options[ $key ] : $default;
	}

	/**
	 * Set plugin option
	 */
	public static function set_plugin_option( $key, $value ) {
		$options         = get_option( 'mirrorly_options', array() );
		$options[ $key ] = $value;
		update_option( 'mirrorly_options', $options );
	}

	/**
	 * Enable Mirrorly for a product
	 */
	public static function enable_mirrorly_for_product( $product_id, $image_id = null ) {
		update_post_meta( $product_id, '_mirrorly_enabled', 'yes' );

		if ( $image_id ) {
			update_post_meta( $product_id, '_mirrorly_image_id', $image_id );
		}
	}

	/**
	 * Disable Mirrorly for a product
	 */
	public static function disable_mirrorly_for_product( $product_id ) {
		update_post_meta( $product_id, '_mirrorly_enabled', 'no' );
	}

	/**
	 * Simulate license activation
	 */
	public static function activate_license( $type = 'free', $license_key = null ) {
		if ( ! $license_key ) {
			$license_key = strtoupper( $type ) . '-' . strtoupper( uniqid() );
		}

		$options                   = get_option( 'mirrorly_options', array() );
		$options['license_key']    = $license_key;
		$options['license_type']   = $type;
		$options['license_status'] = 'active';

		if ( ! isset( $options['api_key'] ) ) {
			$options['api_key'] = 'api_' . uniqid();
		}

		update_option( 'mirrorly_options', $options );

		// Set license validation cache
		$cache_key = 'mirrorly_license_validation_' . md5( $license_key . home_url() );
		set_transient(
			$cache_key,
			array(
				'success' => true,
				'license' => array(
					'type'          => $type,
					'status'        => 'active',
					'monthly_limit' => $type === 'free' ? 10 : 100,
					'current_usage' => 0,
				),
			),
			HOUR_IN_SECONDS
		);

		return $license_key;
	}

	/**
	 * Simulate rate limit exceeded
	 */
	public static function simulate_rate_limit_exceeded() {
		$cache_key = 'mirrorly_limits_' . md5( self::get_plugin_option( 'api_key', 'test_key' ) );
		set_transient(
			$cache_key,
			array(
				'can_generate'          => false,
				'remaining_generations' => 0,
				'monthly_limit'         => 10,
				'current_usage'         => 10,
				'message'               => 'Monthly limit exceeded',
			),
			60
		);
	}

	/**
	 * Clear all plugin caches
	 */
	public static function clear_plugin_caches() {
		global $wpdb;

		$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_mirrorly_%'" );
		$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_mirrorly_%'" );
	}
}
