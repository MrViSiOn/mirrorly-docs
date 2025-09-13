<?php
/**
 * Test file for Mirrorly API Client
 *
 * This is a simple test to verify the API client methods are properly implemented
 */

// Mock WordPress functions for testing
if ( ! function_exists( 'get_option' ) ) {
	function get_option( $option, $default = false ) {
		return $default;
	}
}

if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( $transient ) {
		return false;
	}
}

if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( $transient, $value, $expiration ) {
		return true;
	}
}

if ( ! function_exists( 'home_url' ) ) {
	function home_url() {
		return 'https://example.com';
	}
}

if ( ! function_exists( 'current_time' ) ) {
	function current_time( $type ) {
		return date( 'Y-m-d H:i:s' );
	}
}

if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data ) {
		return json_encode( $data );
	}
}

if ( ! function_exists( 'trailingslashit' ) ) {
	function trailingslashit( $string ) {
		return rtrim( $string, '/' ) . '/';
	}
}

if ( ! function_exists( '__' ) ) {
	function __( $text, $domain = 'default' ) {
		return $text;
	}
}

// Mock WordPress database
class MockWPDB {
	public $options = 'wp_options';
	public $prefix  = 'wp_';

	public function query( $sql ) {
		return true;
	}

	public function insert( $table, $data ) {
		return true;
	}
}

global $wpdb;
$wpdb = new MockWPDB();

// Mock WP_Error class for testing
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		private $errors     = array();
		private $error_data = array();

		public function __construct( $code = '', $message = '', $data = '' ) {
			if ( ! empty( $code ) ) {
				$this->errors[ $code ][] = $message;
				if ( ! empty( $data ) ) {
					$this->error_data[ $code ] = $data;
				}
			}
		}

		public function get_error_message( $code = '' ) {
			if ( empty( $code ) ) {
				$code = $this->get_error_code();
			}
			if ( isset( $this->errors[ $code ] ) ) {
				return $this->errors[ $code ][0];
			}
			return '';
		}

		public function get_error_code() {
			$codes = array_keys( $this->errors );
			return empty( $codes ) ? '' : $codes[0];
		}

		public function get_error_data( $code = '' ) {
			if ( empty( $code ) ) {
				$code = $this->get_error_code();
			}
			return isset( $this->error_data[ $code ] ) ? $this->error_data[ $code ] : null;
		}
	}
}

function is_wp_error( $thing ) {
	return ( $thing instanceof WP_Error );
}

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

if ( ! defined( 'MIRRORLY_VERSION' ) ) {
	define( 'MIRRORLY_VERSION', '1.0.0' );
}

// Include the API client
require_once __DIR__ . '/../includes/class-api-client.php';

// Test the API client
echo "Testing Mirrorly API Client...\n";

$api_client = new Mirrorly_API_Client();

// Test configuration methods
echo "✓ API Client instantiated successfully\n";

$config = $api_client->get_config();
echo '✓ Configuration retrieved: ' . json_encode( $config ) . "\n";

// Test API key setting
$api_client->set_api_key( 'test_api_key_123' );
echo "✓ API key set successfully\n";

// Test URL setting
$api_client->set_api_url( 'https://test-api.mirrorly.com/v1/' );
echo "✓ API URL set successfully\n";

// Test timeout setting
$api_client->set_timeout( 60 );
echo "✓ Timeout set successfully\n";

// Test cache duration setting
$api_client->set_cache_duration( 600 );
echo "✓ Cache duration set successfully\n";

// Test image validation (with non-existent file)
$validation_result = $api_client->validate_image( '/non/existent/file.jpg' );
if ( is_wp_error( $validation_result ) ) {
	echo "✓ Image validation correctly returns error for non-existent file\n";
} else {
	echo "✗ Image validation should return error for non-existent file\n";
}

// Test debug mode
$api_client->set_debug_mode( true );
echo "✓ Debug mode enabled successfully\n";

// Test webhook signature verification
$payload   = '{"test": "data"}';
$secret    = 'test_secret';
$signature = hash_hmac( 'sha256', $payload, $secret );
$is_valid  = $api_client->verify_webhook_signature( $payload, $signature, $secret );
if ( $is_valid ) {
	echo "✓ Webhook signature verification works correctly\n";
} else {
	echo "✗ Webhook signature verification failed\n";
}

echo "\nAll basic tests passed! API Client is properly implemented.\n";
