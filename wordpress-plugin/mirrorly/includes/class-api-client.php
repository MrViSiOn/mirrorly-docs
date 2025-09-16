<?php
/**
 * Mirrorly API Client
 *
 * Handles all communication with the central Mirrorly API
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Mirrorly_API_Client {

	/**
	 * API base URL
	 */
	private $api_url;

	/**
	 * API key
	 */
	private $api_key;

	/**
	 * Cache duration in seconds
	 */
	private $cache_duration = 300; // 5 minutes

	/**
	 * Request timeout in seconds
	 */
	private $timeout = 30;

	/**
	 * Debug mode flag
	 */
	private $debug_mode = false;

	/**
	 * Constructor
	 */
	public function __construct() {
		$options          = get_option( 'mirrorly_options', array() );
		$this->api_url    = defined( 'MIRRORLY_API_URL' ) ? MIRRORLY_API_URL : 'http://localhost:3000/v1/';
		$this->api_key    = isset( $options['api_key'] ) ? $options['api_key'] : '';
		$this->debug_mode = defined( 'WP_DEBUG' ) && WP_DEBUG && defined( 'MIRRORLY_DEBUG' ) && MIRRORLY_DEBUG;
	}

	/**
	 * Generate image using AI
	 *
	 * @param string $user_image_path Path to user image
	 * @param string $product_image_path Path to product image
	 * @param int    $product_id WooCommerce product ID
	 * @param array  $options Generation options
	 * @return array|WP_Error
	 */
	public function generate_image( $user_image_path, $product_image_path, $product_id, $options = array() ) {
		if ( empty( $this->api_key ) ) {
			return new WP_Error( 'no_api_key', __( 'API key no configurada', 'mirrorly' ) );
		}

		// Check rate limits first
		$limits_check = $this->check_limits();
		if ( is_wp_error( $limits_check ) ) {
			return $limits_check;
		}
		if ( ! $limits_check['canGenerate'] ) {
			return new WP_Error( 'rate_limit_exceeded', $limits_check['message'] );
		}

		$endpoint = 'generate/image';

		// Prepare files for upload
		$files = array(
			'userImage'    => array(
				'name'     => basename( $user_image_path ),
				'type'     => mime_content_type( $user_image_path ),
				'tmp_name' => $user_image_path,
				'size'     => filesize( $user_image_path ),
			),
			'productImage' => array(
				'name'     => basename( $product_image_path ),
				'type'     => mime_content_type( $product_image_path ),
				'tmp_name' => $product_image_path,
				'size'     => filesize( $product_image_path ),
			),
		);

		$body = array(
			'productId' => $product_id,
			'domain'    => home_url(),
			'options'   => wp_json_encode( $options ),
		);
		$response = $this->make_multipart_request( $endpoint, $body, $files );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		// Store generation record
		$this->store_generation_record( $product_id, $user_image_path, $product_image_path, $response );

		return $response;
	}

	/**
	 * Generate image asynchronously (non-blocking)
	 *
	 * @param string $user_image_path Path to user image
	 * @param string $product_image_path Path to product image
	 * @param int    $product_id WooCommerce product ID
	 * @param array  $options Generation options
	 * @return array|WP_Error Returns generation ID for status checking
	 */
	public function generate_image_async( $user_image_path, $product_image_path, $product_id, $options = array() ) {
		if ( empty( $this->api_key ) ) {
			return new WP_Error( 'no_api_key', __( 'API key no configurada', 'mirrorly' ) );
		}

		// Check rate limits first
		$limits_check = $this->check_limits();
		if ( is_wp_error( $limits_check ) ) {
			return $limits_check;
		}

		if ( ! $limits_check['can_generate'] ) {
			return new WP_Error( 'rate_limit_exceeded', $limits_check['message'] );
		}

		$endpoint = 'generate/image-async';

		// Prepare files for upload
		$files = array(
			'userImage'    => array(
				'name'     => basename( $user_image_path ),
				'type'     => mime_content_type( $user_image_path ),
				'tmp_name' => $user_image_path,
				'size'     => filesize( $user_image_path ),
			),
			'productImage' => array(
				'name'     => basename( $product_image_path ),
				'type'     => mime_content_type( $product_image_path ),
				'tmp_name' => $product_image_path,
				'size'     => filesize( $product_image_path ),
			),
		);

		$body = array(
			'productId' => $product_id,
			'domain'    => home_url(),
			'options'   => wp_json_encode( $options ),
			'async'     => true,
		);

		$response = $this->make_multipart_request( $endpoint, $body, $files );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		// Store generation record with pending status
		if ( isset( $response['generationId'] ) ) {
			$this->store_generation_record(
				$product_id,
				$user_image_path,
				$product_image_path,
				array(
					'generationId' => $response['generationId'],
					'status'       => 'pending',
				)
			);
		}

		return $response;
	}

	/**
	 * Validate license key
	 *
	 * @param string $license_key License key to validate
	 * @param string $domain Domain to validate against
	 * @return array|WP_Error
	 */
	public function validate_license( $license_key = null, $domain = null ) {
		$license_key = $license_key ?: $this->get_license_key();
		$domain      = $domain ?: home_url();

		if ( empty( $license_key ) ) {
			return new WP_Error( 'no_license_key', __( 'Clave de licencia no proporcionada', 'mirrorly' ) );
		}

		$cache_key     = 'mirrorly_license_validation_' . md5( $license_key . $domain );
		$cached_result = get_transient( $cache_key );

		if ( $cached_result !== false ) {
			return $cached_result;
		}

		$endpoint = 'auth/validate-license';
		$body     = array(
			'licenseKey' => $license_key,
			'domain'     => $domain,
		);

		$response = $this->make_request( $endpoint, $body, 'POST' );

		if ( ! is_wp_error( $response ) ) {
			// Cache successful validation for 1 hour
			set_transient( $cache_key, $response, HOUR_IN_SECONDS );
		}

		return $response;
	}

	/**
	 * Check current usage limits
	 *
	 * @return array|WP_Error
	 */
	public function check_limits() {
		$cache_key     = 'mirrorly_limits_' . md5( $this->api_key );
		$cached_result = get_transient( $cache_key );

		if ( $cached_result !== false ) {
			// return $cached_result;
		}
		$endpoint = 'limits/current';
		$response = $this->make_request( $endpoint, array(), 'GET' );

		if ( ! is_wp_error( $response ) ) {
			// Cache limits for 1 minute
			set_transient( $cache_key, $response, 60 );
		}

		return $response;
	}

	/**
	 * Get multiple generation statuses at once
	 *
	 * @param array $generation_ids Array of generation IDs
	 * @return array|WP_Error
	 */
	public function get_multiple_generation_status( $generation_ids ) {
		if ( empty( $generation_ids ) || ! is_array( $generation_ids ) ) {
			return new WP_Error( 'invalid_generation_ids', __( 'IDs de generación no válidos', 'mirrorly' ) );
		}

		$endpoint = 'generate/status/batch';
		$body     = array( 'generationIds' => $generation_ids );

		return $this->make_request( $endpoint, $body, 'POST' );
	}

	/**
	 * Get current usage statistics
	 *
	 * @return array|WP_Error
	 */
	public function get_usage_stats() {
		$cache_key     = 'mirrorly_usage_' . md5( $this->api_key );
		$cached_result = get_transient( $cache_key );

		if ( $cached_result !== false ) {
			return $cached_result;
		}

		$endpoint = 'limits/current';
		$response = $this->make_request( $endpoint, array(), 'GET' );

		if ( ! is_wp_error( $response ) ) {
			// Cache usage stats for 2 minutes
			set_transient( $cache_key, $response, 120 );
		}

		return $response;
	}

	/**
	 * Register free license
	 *
	 * @param string $domain Domain to register
	 * @return array|WP_Error
	 */
	public function register_free_license( $domain = null ) {
		$domain = $domain ?: home_url();

		$endpoint = 'auth/register-free';
		$body     = array(
			'domain'      => $domain,
			'site_name'   => get_bloginfo( 'name' ),
			'admin_email' => get_option( 'admin_email' ),
		);

		return $this->make_request( $endpoint, $body, 'POST' );
	}

	/**
	 * Register PRO license
	 *
	 * @param string $license_key PRO license key
	 * @param string $domain Domain to register
	 * @return array|WP_Error
	 */
	public function register_pro_license( $license_key, $domain = null ) {
		$domain = $domain ?: home_url();

		$endpoint = 'auth/register-pro';
		$body     = array(
			'licenseKey'  => $license_key,
			'domain'      => $domain,
			'site_name'   => get_bloginfo( 'name' ),
			'admin_email' => get_option( 'admin_email' ),
		);

		return $this->make_request( $endpoint, $body, 'POST' );
	}

	/**
	 * Make HTTP request to API
	 *
	 * @param string $endpoint API endpoint
	 * @param array  $body Request body
	 * @param string $method HTTP method
	 * @return array|WP_Error
	 */
	private function make_request( $endpoint, $body = array(), $method = 'POST' ) {
		$debug = strpos( $endpoint, 'limits' ) !== false ? true : $this->debug_mode;

		$url = trailingslashit( $this->api_url ) . $endpoint;

		$headers = array(
			'Content-Type' => 'application/json',
			'User-Agent'   => 'Mirrorly-WordPress/' . MIRRORLY_VERSION,
		);
		if ( ! empty( $this->api_key ) ) {
			$headers['x-api-key'] = $this->api_key;
		}

		$args = array(
			'method'    => $method,
			'headers'   => $headers,
			'timeout'   => $this->timeout,
			'sslverify' => true,
		);

		if ( $method === 'POST' && ! empty( $body ) ) {
			$args['body'] = wp_json_encode( $body );
		} elseif ( $method === 'GET' && ! empty( $body ) ) {
			$url = add_query_arg( $body, $url );
		}
		// Log request if debug mode is enabled
		if ( $this->debug_mode ) {
			$this->log_request( $method, $url, $body );
		}

		$start_time = microtime( true );
		$response   = wp_remote_request( $url, $args );
		$end_time   = microtime( true );

		// Log response if debug mode is enabled
		if ( $this->debug_mode ) {
			$this->log_response( $response, $end_time - $start_time );
		}

		return $this->process_response( $response );
	}

	/**
	 * Log API request for debugging
	 *
	 * @param string $method HTTP method
	 * @param string $url Request URL
	 * @param array  $body Request body
	 */
	private function log_request( $method, $url, $body ) {
		if ( ! $this->debug_mode ) {
			return;
		}

		$log_data = array(
			'timestamp'   => current_time( 'mysql' ),
			'method'      => $method,
			'url'         => $url,
			'body'        => $body,
			'has_api_key' => ! empty( $this->api_key ),
		);

		error_log( 'Mirrorly API Request: ' . wp_json_encode( $log_data ) );
	}

	/**
	 * Log API response for debugging
	 *
	 * @param array|WP_Error $response HTTP response
	 * @param float          $duration Request duration in seconds
	 */
	private function log_response( $response, $duration ) {
		if ( ! $this->debug_mode ) {
			return;
		}

		$log_data = array(
			'timestamp'     => current_time( 'mysql' ),
			'duration'      => round( $duration, 3 ),
			'is_error'      => is_wp_error( $response ),
			'status_code'   => is_wp_error( $response ) ? null : wp_remote_retrieve_response_code( $response ),
			'error_message' => is_wp_error( $response ) ? $response->get_error_message() : null,
		);

		error_log( 'Mirrorly API Response: ' . wp_json_encode( $log_data ) );
	}

	/**
	 * Make multipart request for file uploads
	 *
	 * @param string $endpoint API endpoint
	 * @param array  $body Request body
	 * @param array  $files Files to upload
	 * @return array|WP_Error
	 */
	private function make_multipart_request( $endpoint, $body = array(), $files = array() ) {
		$url = trailingslashit( $this->api_url ) . $endpoint;

		$boundary = wp_generate_password( 24, false );
		$headers  = array(
			'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
			'User-Agent'   => 'Mirrorly-WordPress/' . MIRRORLY_VERSION,
		);

		if ( ! empty( $this->api_key ) ) {
			$headers['x-api-key'] = $this->api_key;
		}

		// Build multipart body
		$multipart_body = '';

		// Add regular fields
		foreach ( $body as $key => $value ) {
			$multipart_body .= "--{$boundary}\r\n";
			$multipart_body .= "Content-Disposition: form-data; name=\"{$key}\"\r\n\r\n";
			$multipart_body .= $value . "\r\n";
		}

		// Add files
		foreach ( $files as $field_name => $file ) {
			$multipart_body .= "--{$boundary}\r\n";
			$multipart_body .= "Content-Disposition: form-data; name=\"{$field_name}\"; filename=\"{$file['name']}\"\r\n";
			$multipart_body .= "Content-Type: {$file['type']}\r\n\r\n";
			$multipart_body .= file_get_contents( $file['tmp_name'] ) . "\r\n";
		}

		$multipart_body .= "--{$boundary}--\r\n";

		$args = array(
			'method'    => 'POST',
			'headers'   => $headers,
			'body'      => $multipart_body,
			'timeout'   => 60, // Longer timeout for file uploads
			'sslverify' => true,
		);
echo "<textarea>";print_r($url);echo "</textarea>";
echo "<textarea>";print_r($args);echo "</textarea>";exit();
		$response = wp_remote_request( $url, $args );

		return $this->process_response( $response );
	}

	/**
	 * Process API response
	 *
	 * @param array|WP_Error $response HTTP response
	 * @return array|WP_Error
	 */
	private function process_response( $response ) {
		if ( is_wp_error( $response ) ) {
			$error_message = __( 'Error de conexión con la API', 'mirrorly' ) . ': ' . $response->get_error_message();
			$this->store_last_error( $error_message );
			return new WP_Error( 'api_request_failed', $error_message );
		}

		$response_code = wp_remote_retrieve_response_code( $response );
		$response_body = wp_remote_retrieve_body( $response );

		// Handle empty response
		if ( empty( $response_body ) ) {
			$error_message = __( 'Respuesta vacía de la API', 'mirrorly' );
			$this->store_last_error( $error_message );
			return new WP_Error( 'empty_response', $error_message, array( 'status' => $response_code ) );
		}

		$data = json_decode( $response_body, true );

		// Handle JSON decode errors
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			$error_message = __( 'Respuesta inválida de la API', 'mirrorly' ) . ': ' . json_last_error_msg();
			$this->store_last_error( $error_message );
			return new WP_Error( 'invalid_json', $error_message, array( 'status' => $response_code ) );
		}

		if ( $response_code >= 200 && $response_code < 300 ) {
			return $data;
		}

		// Handle specific HTTP error codes
		$error_message = isset( $data['error'] ) ? $data['error'] : $this->get_http_error_message( $response_code );
		$error_code    = isset( $data['code'] ) ? $data['code'] : $this->get_error_code_from_status( $response_code );

		$this->store_last_error( $error_message );

		return new WP_Error(
			$error_code,
			$error_message,
			array(
				'status'        => $response_code,
				'response_data' => $data,
			)
		);
	}

	/**
	 * Get human-readable error message for HTTP status codes
	 *
	 * @param int $status_code HTTP status code
	 * @return string
	 */
	private function get_http_error_message( $status_code ) {
		$messages = array(
			400 => __( 'Solicitud inválida', 'mirrorly' ),
			401 => __( 'API key inválida o no autorizada', 'mirrorly' ),
			403 => __( 'Acceso denegado', 'mirrorly' ),
			404 => __( 'Endpoint no encontrado', 'mirrorly' ),
			429 => __( 'Límite de solicitudes excedido', 'mirrorly' ),
			500 => __( 'Error interno del servidor', 'mirrorly' ),
			502 => __( 'Servidor no disponible', 'mirrorly' ),
			503 => __( 'Servicio temporalmente no disponible', 'mirrorly' ),
			504 => __( 'Timeout del servidor', 'mirrorly' ),
		);

		return isset( $messages[ $status_code ] ) ? $messages[ $status_code ] : __( 'Error desconocido de la API', 'mirrorly' );
	}

	/**
	 * Get error code from HTTP status
	 *
	 * @param int $status_code HTTP status code
	 * @return string
	 */
	private function get_error_code_from_status( $status_code ) {
		$codes = array(
			400 => 'bad_request',
			401 => 'unauthorized',
			403 => 'forbidden',
			404 => 'not_found',
			429 => 'rate_limit_exceeded',
			500 => 'server_error',
			502 => 'bad_gateway',
			503 => 'service_unavailable',
			504 => 'gateway_timeout',
		);

		return isset( $codes[ $status_code ] ) ? $codes[ $status_code ] : 'api_error';
	}

	/**
	 * Get license key from options
	 *
	 * @return string
	 */
	private function get_license_key() {
		$options = get_option( 'mirrorly_options', array() );
		return isset( $options['license_key'] ) ? $options['license_key'] : '';
	}

	/**
	 * Store generation record in database
	 *
	 * @param int    $product_id Product ID
	 * @param string $user_image_path User image path
	 * @param string $product_image_path Product image path
	 * @param array  $api_response API response
	 */
	private function store_generation_record( $product_id, $user_image_path, $product_image_path, $api_response ) {
		global $wpdb;

		$table_name = $wpdb->prefix . 'mirrorly_generations';

		$data = array(
			'user_id'            => get_current_user_id(),
			'product_id'         => $product_id,
			'user_image_hash'    => md5_file( $user_image_path ),
			'product_image_hash' => md5_file( $product_image_path ),
			'result_image_url'   => isset( $api_response['imageUrl'] ) ? $api_response['imageUrl'] : null,
			'status'             => isset( $api_response['success'] ) && $api_response['success'] ? 'completed' : 'failed',
			'api_request_id'     => isset( $api_response['requestId'] ) ? $api_response['requestId'] : null,
			'created_at'         => current_time( 'mysql' ),
			'completed_at'       => current_time( 'mysql' ),
		);

		$wpdb->insert( $table_name, $data );
	}

	/**
	 * Get authentication status
	 *
	 * @return array|WP_Error
	 */
	public function get_auth_status() {
		$cache_key     = 'mirrorly_auth_status_' . md5( $this->api_key );
		$cached_result = get_transient( $cache_key );

		if ( $cached_result !== false ) {
			return $cached_result;
		}

		$endpoint = 'auth/status';
		$response = $this->make_request( $endpoint, array(), 'GET' );

		if ( ! is_wp_error( $response ) ) {
			// Cache auth status for 5 minutes
			set_transient( $cache_key, $response, 300 );
		}

		return $response;
	}

	/**
	 * Get generation status by ID
	 *
	 * @param string $generation_id Generation ID
	 * @return array|WP_Error
	 */
	public function get_generation_status( $generation_id ) {
		if ( empty( $generation_id ) ) {
			return new WP_Error( 'invalid_generation_id', __( 'ID de generación no válido', 'mirrorly' ) );
		}

		$endpoint = 'generate/status/' . $generation_id;
		return $this->make_request( $endpoint, array(), 'GET' );
	}

	/**
	 * Get generation result by ID
	 *
	 * @param string $generation_id Generation ID
	 * @return array|WP_Error
	 */
	public function get_generation_result( $generation_id ) {
		if ( empty( $generation_id ) ) {
			return new WP_Error( 'invalid_generation_id', __( 'ID de generación no válido', 'mirrorly' ) );
		}

		$cache_key     = 'mirrorly_generation_result_' . $generation_id;
		$cached_result = get_transient( $cache_key );

		if ( $cached_result !== false ) {
			return $cached_result;
		}

		$endpoint = 'generate/result/' . $generation_id;
		$response = $this->make_request( $endpoint, array(), 'GET' );

		if ( ! is_wp_error( $response ) && isset( $response['status'] ) && $response['status'] === 'completed' ) {
			// Cache completed results for 1 hour
			set_transient( $cache_key, $response, HOUR_IN_SECONDS );
		}

		return $response;
	}

	/**
	 * Test API connection
	 *
	 * @return array|WP_Error
	 */
	public function test_connection() {
		if ( empty( $this->api_key ) ) {
			return new WP_Error( 'no_api_key', __( 'API key no configurada', 'mirrorly' ) );
		}

		return $this->get_auth_status();
	}

	/**
	 * Get API health status
	 *
	 * @return array|WP_Error
	 */
	public function get_api_health() {
		$endpoint = 'health';
		return $this->make_request( $endpoint, array(), 'GET' );
	}

	/**
	 * Clear API cache
	 */
	public function clear_cache() {
		global $wpdb;

		$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_mirrorly_%'" );
		$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_mirrorly_%'" );
	}

	/**
	 * Set API key
	 *
	 * @param string $api_key New API key
	 */
	public function set_api_key( $api_key ) {
		$this->api_key = $api_key;
		$this->clear_cache(); // Clear cache when API key changes
	}

	/**
	 * Set API URL
	 *
	 * @param string $api_url New API URL
	 */
	public function set_api_url( $api_url ) {
		$this->api_url = trailingslashit( $api_url );
		$this->clear_cache(); // Clear cache when API URL changes
	}

	/**
	 * Set request timeout
	 *
	 * @param int $timeout Timeout in seconds
	 */
	public function set_timeout( $timeout ) {
		$this->timeout = max( 5, intval( $timeout ) ); // Minimum 5 seconds
	}

	/**
	 * Set cache duration
	 *
	 * @param int $duration Cache duration in seconds
	 */
	public function set_cache_duration( $duration ) {
		$this->cache_duration = max( 60, intval( $duration ) ); // Minimum 1 minute
	}

	/**
	 * Get last API error
	 *
	 * @return string|null
	 */
	public function get_last_error() {
		return get_transient( 'mirrorly_last_api_error' );
	}

	/**
	 * Store last API error
	 *
	 * @param string $error Error message
	 */
	private function store_last_error( $error ) {
		set_transient( 'mirrorly_last_api_error', $error, 300 ); // Store for 5 minutes
	}

	/**
	 * Retry request with exponential backoff
	 *
	 * @param string $endpoint API endpoint
	 * @param array  $body Request body
	 * @param string $method HTTP method
	 * @param int    $max_retries Maximum number of retries
	 * @return array|WP_Error
	 */
	private function make_request_with_retry( $endpoint, $body = array(), $method = 'POST', $max_retries = 3 ) {
		$attempt    = 0;
		$last_error = null;

		while ( $attempt < $max_retries ) {
			$response = $this->make_request( $endpoint, $body, $method );

			if ( ! is_wp_error( $response ) ) {
				return $response;
			}

			$last_error = $response;
			++$attempt;

			// Don't retry on authentication errors or client errors (4xx)
			$error_data = $response->get_error_data();
			if ( isset( $error_data['status'] ) && $error_data['status'] >= 400 && $error_data['status'] < 500 ) {
				break;
			}

			// Exponential backoff: wait 1s, 2s, 4s...
			if ( $attempt < $max_retries ) {
				sleep( pow( 2, $attempt - 1 ) );
			}
		}

		// Store the last error for debugging
		if ( $last_error ) {
			$this->store_last_error( $last_error->get_error_message() );
		}

		return $last_error;
	}

	/**
	 * Validate image file before upload
	 *
	 * @param string $file_path Path to image file
	 * @return bool|WP_Error
	 */
	public function validate_image( $file_path ) {
		if ( ! file_exists( $file_path ) ) {
			return new WP_Error( 'file_not_found', __( 'Archivo de imagen no encontrado', 'mirrorly' ) );
		}

		$file_size = filesize( $file_path );
		$max_size  = 10 * 1024 * 1024; // 10MB

		if ( $file_size > $max_size ) {
			return new WP_Error( 'file_too_large', __( 'La imagen es demasiado grande. Máximo 10MB permitido.', 'mirrorly' ) );
		}

		$mime_type     = mime_content_type( $file_path );
		$allowed_types = array( 'image/jpeg', 'image/png', 'image/gif', 'image/webp' );

		if ( ! in_array( $mime_type, $allowed_types ) ) {
			return new WP_Error( 'invalid_file_type', __( 'Tipo de archivo no válido. Solo se permiten imágenes JPEG, PNG, GIF y WebP.', 'mirrorly' ) );
		}

		// Check if it's actually an image
		$image_info = getimagesize( $file_path );
		if ( $image_info === false ) {
			return new WP_Error( 'invalid_image', __( 'El archivo no es una imagen válida', 'mirrorly' ) );
		}

		return true;
	}

	/**
	 * Get API configuration
	 *
	 * @return array
	 */
	public function get_config() {
		return array(
			'api_url'        => $this->api_url,
			'has_api_key'    => ! empty( $this->api_key ),
			'timeout'        => $this->timeout,
			'cache_duration' => $this->cache_duration,
		);
	}

	/**
	 * Verify webhook signature
	 *
	 * @param string $payload Webhook payload
	 * @param string $signature Webhook signature
	 * @param string $secret Webhook secret
	 * @return bool
	 */
	public function verify_webhook_signature( $payload, $signature, $secret = null ) {
		if ( empty( $secret ) ) {
			$options = get_option( 'mirrorly_options', array() );
			$secret  = isset( $options['webhook_secret'] ) ? $options['webhook_secret'] : '';
		}

		if ( empty( $secret ) ) {
			return false;
		}

		$expected_signature = hash_hmac( 'sha256', $payload, $secret );

		return hash_equals( $expected_signature, $signature );
	}

	/**
	 * Register webhook endpoint
	 *
	 * @param string $webhook_url Webhook URL
	 * @param array  $events Events to subscribe to
	 * @return array|WP_Error
	 */
	public function register_webhook( $webhook_url, $events = array( 'generation.completed', 'generation.failed' ) ) {
		$endpoint = 'webhooks/register';
		$body     = array(
			'url'    => $webhook_url,
			'events' => $events,
			'domain' => home_url(),
		);

		return $this->make_request( $endpoint, $body, 'POST' );
	}

	/**
	 * Unregister webhook endpoint
	 *
	 * @param string $webhook_id Webhook ID
	 * @return array|WP_Error
	 */
	public function unregister_webhook( $webhook_id ) {
		$endpoint = 'webhooks/unregister';
		$body     = array( 'webhookId' => $webhook_id );

		return $this->make_request( $endpoint, $body, 'POST' );
	}

	/**
	 * Enable debug mode
	 *
	 * @param bool $enable Enable or disable debug mode
	 */
	public function set_debug_mode( $enable ) {
		$this->debug_mode = (bool) $enable;
	}
}
