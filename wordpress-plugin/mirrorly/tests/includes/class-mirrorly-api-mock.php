<?php
/**
 * Mock API client for testing
 */

class Mirrorly_API_Mock {

	/**
	 * Mock responses
	 */
	private static $mock_responses = array();

	/**
	 * Request history
	 */
	private static $request_history = array();

	/**
	 * Set mock response for specific endpoint
	 */
	public static function set_mock_response( $endpoint, $response, $status_code = 200 ) {
		self::$mock_responses[ $endpoint ] = array(
			'response'    => $response,
			'status_code' => $status_code,
		);
	}

	/**
	 * Clear all mock responses
	 */
	public static function clear_mock_responses() {
		self::$mock_responses  = array();
		self::$request_history = array();
	}

	/**
	 * Get request history
	 */
	public static function get_request_history() {
		return self::$request_history;
	}

	/**
	 * Get last request
	 */
	public static function get_last_request() {
		return end( self::$request_history );
	}

	/**
	 * Mock successful license validation
	 */
	public static function mock_license_validation( $license_type = 'free', $is_valid = true ) {
		$response = array(
			'success' => $is_valid,
			'license' => array(
				'type'                  => $license_type,
				'status'                => $is_valid ? 'active' : 'invalid',
				'monthly_limit'         => $license_type === 'free' ? 10 : 100,
				'current_usage'         => 0,
				'remaining_generations' => $license_type === 'free' ? 10 : 100,
			),
		);

		self::set_mock_response( 'auth/validate-license', $response, $is_valid ? 200 : 401 );
	}

	/**
	 * Mock successful image generation
	 */
	public static function mock_image_generation( $success = true ) {
		if ( $success ) {
			$response = array(
				'success'        => true,
				'imageUrl'       => 'https://example.com/generated-image.jpg',
				'processingTime' => 5000,
				'generationId'   => 'gen_' . uniqid(),
			);
			self::set_mock_response( 'generate/image', $response, 200 );
		} else {
			$response = array(
				'error' => 'Generation failed',
				'code'  => 'GENERATION_ERROR',
			);
			self::set_mock_response( 'generate/image', $response, 500 );
		}
	}

	/**
	 * Mock rate limit check
	 */
	public static function mock_rate_limit_check( $can_generate = true, $remaining = 10 ) {
		$response = array(
			'can_generate'          => $can_generate,
			'remaining_generations' => $remaining,
			'monthly_limit'         => 10,
			'current_usage'         => 10 - $remaining,
			'message'               => $can_generate ? 'OK' : 'Rate limit exceeded',
		);

		self::set_mock_response( 'limits/current', $response, 200 );
	}

	/**
	 * Mock usage statistics
	 */
	public static function mock_usage_stats( $current_usage = 0, $monthly_limit = 10 ) {
		$response = array(
			'current_usage'         => $current_usage,
			'monthly_limit'         => $monthly_limit,
			'remaining_generations' => $monthly_limit - $current_usage,
			'reset_date'            => date( 'Y-m-d H:i:s', strtotime( '+1 month' ) ),
		);

		self::set_mock_response( 'limits/usage', $response, 200 );
	}

	/**
	 * Mock free license registration
	 */
	public static function mock_free_license_registration( $success = true ) {
		if ( $success ) {
			$response = array(
				'success'       => true,
				'license_key'   => 'FREE-' . strtoupper( uniqid() ),
				'api_key'       => 'api_' . uniqid(),
				'type'          => 'free',
				'monthly_limit' => 10,
			);
			self::set_mock_response( 'auth/register-free', $response, 201 );
		} else {
			$response = array(
				'error' => 'Registration failed',
				'code'  => 'REGISTRATION_ERROR',
			);
			self::set_mock_response( 'auth/register-free', $response, 400 );
		}
	}

	/**
	 * Mock PRO license registration
	 */
	public static function mock_pro_license_registration( $success = true ) {
		if ( $success ) {
			$response = array(
				'success'       => true,
				'license_key'   => 'PRO-' . strtoupper( uniqid() ),
				'api_key'       => 'api_' . uniqid(),
				'type'          => 'pro_basic',
				'monthly_limit' => 100,
			);
			self::set_mock_response( 'auth/register-pro', $response, 201 );
		} else {
			$response = array(
				'error' => 'Invalid license key',
				'code'  => 'INVALID_LICENSE',
			);
			self::set_mock_response( 'auth/register-pro', $response, 400 );
		}
	}

	/**
	 * Install HTTP request filter
	 */
	public static function install() {
		add_filter( 'pre_http_request', array( __CLASS__, 'intercept_http_request' ), 10, 3 );
	}

	/**
	 * Uninstall HTTP request filter
	 */
	public static function uninstall() {
		remove_filter( 'pre_http_request', array( __CLASS__, 'intercept_http_request' ), 10 );
	}

	/**
	 * Intercept HTTP requests and return mock responses
	 */
	public static function intercept_http_request( $preempt, $args, $url ) {
		// Only intercept Mirrorly API requests
		if ( strpos( $url, 'api.mirrorly.com' ) === false && strpos( $url, 'mirrorly' ) === false ) {
			return $preempt;
		}

		// Record the request
		self::$request_history[] = array(
			'url'       => $url,
			'args'      => $args,
			'timestamp' => time(),
		);

		// Extract endpoint from URL
		$endpoint = self::extract_endpoint_from_url( $url );

		// Check if we have a mock response for this endpoint
		if ( isset( self::$mock_responses[ $endpoint ] ) ) {
			$mock = self::$mock_responses[ $endpoint ];

			return array(
				'headers'  => array( 'content-type' => 'application/json' ),
				'body'     => is_array( $mock['response'] ) ? wp_json_encode( $mock['response'] ) : $mock['response'],
				'response' => array(
					'code'    => $mock['status_code'],
					'message' => self::get_status_message( $mock['status_code'] ),
				),
				'cookies'  => array(),
				'filename' => null,
			);
		}

		// Default response for unmocked endpoints
		return array(
			'headers'  => array( 'content-type' => 'application/json' ),
			'body'     => wp_json_encode( array( 'error' => 'Endpoint not mocked' ) ),
			'response' => array(
				'code'    => 404,
				'message' => 'Not Found',
			),
			'cookies'  => array(),
			'filename' => null,
		);
	}

	/**
	 * Extract endpoint from URL
	 */
	private static function extract_endpoint_from_url( $url ) {
		// Remove base URL and version
		$endpoint = preg_replace( '#^https?://[^/]+/v\d+/#', '', $url );

		// Remove query parameters
		$endpoint = strtok( $endpoint, '?' );

		return $endpoint;
	}

	/**
	 * Get HTTP status message
	 */
	private static function get_status_message( $code ) {
		$messages = array(
			200 => 'OK',
			201 => 'Created',
			400 => 'Bad Request',
			401 => 'Unauthorized',
			403 => 'Forbidden',
			404 => 'Not Found',
			429 => 'Too Many Requests',
			500 => 'Internal Server Error',
		);

		return isset( $messages[ $code ] ) ? $messages[ $code ] : 'Unknown';
	}

	/**
	 * Assert that a request was made to a specific endpoint
	 */
	public static function assert_request_made( $endpoint, $method = null ) {
		foreach ( self::$request_history as $request ) {
			if ( strpos( $request['url'], $endpoint ) !== false ) {
				if ( $method === null || ( isset( $request['args']['method'] ) && $request['args']['method'] === $method ) ) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Get number of requests made to an endpoint
	 */
	public static function get_request_count( $endpoint = null ) {
		if ( $endpoint === null ) {
			return count( self::$request_history );
		}

		$count = 0;
		foreach ( self::$request_history as $request ) {
			if ( strpos( $request['url'], $endpoint ) !== false ) {
				++$count;
			}
		}

		return $count;
	}
}
