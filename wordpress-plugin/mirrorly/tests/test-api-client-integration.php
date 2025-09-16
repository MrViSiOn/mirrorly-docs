<?php
/**
 * Integration tests for Mirrorly_API_Client class
 */

class Test_Mirrorly_API_Client_Integration extends Mirrorly_Test_Case {

	private $api_client;

	public function setUp(): void {
		parent::setUp();

		$this->api_client = new Mirrorly_API_Client();

		// Install API mock
		Mirrorly_API_Mock::install();
	}

	public function tearDown(): void {
		Mirrorly_API_Mock::uninstall();
		Mirrorly_API_Mock::clear_mock_responses();
		Mirrorly_Test_Helpers::clear_plugin_caches();

		parent::tearDown();
	}

	/**
	 * Test API client initialization
	 */
	public function test_api_client_initialization() {
		$this->assertInstanceOf( 'Mirrorly_API_Client', $this->api_client );

		$config = $this->api_client->get_config();
		$this->assertIsArray( $config );
		$this->assertArrayHasKey( 'api_url', $config );
		$this->assertArrayHasKey( 'has_api_key', $config );
	}

	/**
	 * Test successful license validation
	 */
	public function test_successful_license_validation() {
		Mirrorly_API_Mock::mock_license_validation( 'pro_basic', true );

		$result = $this->api_client->validate_license( 'TEST-PRO-LICENSE', 'example.com' );

		$this->assertIsArray( $result );
		$this->assertTrue( $result['success'] );
		$this->assertEquals( 'pro_basic', $result['license']['type'] );

		// Check that request was made
		$this->assertTrue( Mirrorly_API_Mock::assert_request_made( 'auth/validate-license' ) );
	}

	/**
	 * Test failed license validation
	 */
	public function test_failed_license_validation() {
		Mirrorly_API_Mock::mock_license_validation( 'free', false );

		$result = $this->api_client->validate_license( 'INVALID-LICENSE', 'example.com' );

		$this->assertInstanceOf( 'WP_Error', $result );
	}

	/**
	 * Test license validation caching
	 */
	public function test_license_validation_caching() {
		Mirrorly_API_Mock::mock_license_validation( 'pro_basic', true );

		// First call
		$result1 = $this->api_client->validate_license( 'TEST-LICENSE', 'example.com' );

		// Second call should use cache
		$result2 = $this->api_client->validate_license( 'TEST-LICENSE', 'example.com' );

		$this->assertEquals( $result1, $result2 );

		// Should only make one API request due to caching
		$this->assertEquals( 1, Mirrorly_API_Mock::get_request_count( 'auth/validate-license' ) );
	}

	/**
	 * Test rate limit checking
	 */
	public function test_rate_limit_checking() {
		Mirrorly_API_Mock::mock_rate_limit_check( true, 5 );

		$result = $this->api_client->check_limits();

		$this->assertIsArray( $result );
		$this->assertTrue( $result['can_generate'] );
		$this->assertEquals( 5, $result['remaining_generations'] );
	}

	/**
	 * Test rate limit exceeded
	 */
	public function test_rate_limit_exceeded() {
		Mirrorly_API_Mock::mock_rate_limit_check( false, 0 );

		$result = $this->api_client->check_limits();

		$this->assertIsArray( $result );
		$this->assertFalse( $result['can_generate'] );
		$this->assertEquals( 0, $result['remaining_generations'] );
	}

	/**
	 * Test successful image generation
	 */
	public function test_successful_image_generation() {
		// Mock prerequisites
		Mirrorly_API_Mock::mock_rate_limit_check( true, 5 );
		Mirrorly_API_Mock::mock_image_generation( true );

		// Create test images
		$user_image    = Mirrorly_Test_Helpers::create_temp_image();
		$product_image = Mirrorly_Test_Helpers::create_temp_image();

		$result = $this->api_client->generate_image( $user_image, $product_image, 123 );

		$this->assertIsArray( $result );
		$this->assertTrue( $result['success'] );
		$this->assertArrayHasKey( 'imageUrl', $result );
		$this->assertArrayHasKey( 'imageBase64', $result );

		// Clean up
		unlink( $user_image );
		unlink( $product_image );
	}

	/**
	 * Test image generation with rate limit exceeded
	 */
	public function test_image_generation_rate_limit_exceeded() {
		// Mock rate limit exceeded
		Mirrorly_API_Mock::mock_rate_limit_check( false, 0 );

		$user_image    = Mirrorly_Test_Helpers::create_temp_image();
		$product_image = Mirrorly_Test_Helpers::create_temp_image();

		$result = $this->api_client->generate_image( $user_image, $product_image, 123 );

		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'rate_limit_exceeded', $result->get_error_code() );

		// Clean up
		unlink( $user_image );
		unlink( $product_image );
	}

	/**
	 * Test image generation without API key
	 */
	public function test_image_generation_without_api_key() {
		// Clear API key
		$this->api_client->set_api_key( '' );

		$user_image    = Mirrorly_Test_Helpers::create_temp_image();
		$product_image = Mirrorly_Test_Helpers::create_temp_image();

		$result = $this->api_client->generate_image( $user_image, $product_image, 123 );

		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'no_api_key', $result->get_error_code() );

		// Clean up
		unlink( $user_image );
		unlink( $product_image );
	}

	/**
	 * Test usage statistics retrieval
	 */
	public function test_usage_statistics_retrieval() {
		Mirrorly_API_Mock::mock_usage_stats( 3, 10 );

		$result = $this->api_client->get_usage_stats();

		$this->assertIsArray( $result );
		$this->assertEquals( 3, $result['current_usage'] );
		$this->assertEquals( 10, $result['monthly_limit'] );
		$this->assertEquals( 7, $result['remaining_generations'] );
	}

	/**
	 * Test free license registration
	 */
	public function test_free_license_registration() {
		Mirrorly_API_Mock::mock_free_license_registration( true );

		$result = $this->api_client->register_free_license( 'example.com' );

		$this->assertIsArray( $result );
		$this->assertTrue( $result['success'] );
		$this->assertArrayHasKey( 'license_key', $result );
		$this->assertEquals( 'free', $result['type'] );
	}

	/**
	 * Test PRO license registration
	 */
	public function test_pro_license_registration() {
		Mirrorly_API_Mock::mock_pro_license_registration( true );

		$result = $this->api_client->register_pro_license( 'PRO-LICENSE-KEY', 'example.com' );

		$this->assertIsArray( $result );
		$this->assertTrue( $result['success'] );
		$this->assertArrayHasKey( 'license_key', $result );
		$this->assertEquals( 'pro_basic', $result['type'] );
	}

	/**
	 * Test generation status checking
	 */
	public function test_generation_status_checking() {
		Mirrorly_API_Mock::set_mock_response(
			'generate/status/test123',
			array(
				'status'   => 'processing',
				'progress' => 50,
			)
		);

		$result = $this->api_client->get_generation_status( 'test123' );

		$this->assertIsArray( $result );
		$this->assertEquals( 'processing', $result['status'] );
		$this->assertEquals( 50, $result['progress'] );
	}

	/**
	 * Test generation result retrieval
	 */
	public function test_generation_result_retrieval() {
		Mirrorly_API_Mock::set_mock_response(
			'generate/result/test123',
			array(
				'status'         => 'completed',
				'imageUrl'       => 'https://example.com/result.jpg',
				'processingTime' => 5000,
			)
		);

		$result = $this->api_client->get_generation_result( 'test123' );

		$this->assertIsArray( $result );
		$this->assertEquals( 'completed', $result['status'] );
		$this->assertArrayHasKey( 'imageUrl', $result );
	}

	/**
	 * Test API connection testing
	 */
	public function test_api_connection_testing() {
		Mirrorly_API_Mock::set_mock_response(
			'auth/status',
			array(
				'authenticated' => true,
				'license'       => array( 'type' => 'pro_basic' ),
			)
		);

		$result = $this->api_client->test_connection();

		$this->assertIsArray( $result );
		$this->assertTrue( $result['authenticated'] );
	}

	/**
	 * Test API health check
	 */
	public function test_api_health_check() {
		Mirrorly_API_Mock::set_mock_response(
			'health',
			array(
				'status'  => 'healthy',
				'version' => '1.0.0',
			)
		);

		$result = $this->api_client->get_api_health();

		$this->assertIsArray( $result );
		$this->assertEquals( 'healthy', $result['status'] );
	}

	/**
	 * Test image validation
	 */
	public function test_image_validation() {
		// Test valid image
		$valid_image = Mirrorly_Test_Helpers::create_temp_image();
		$result      = $this->api_client->validate_image( $valid_image );
		$this->assertTrue( $result );

		// Test non-existent file
		$result = $this->api_client->validate_image( '/non/existent/file.jpg' );
		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'file_not_found', $result->get_error_code() );

		// Clean up
		unlink( $valid_image );
	}

	/**
	 * Test webhook signature verification
	 */
	public function test_webhook_signature_verification() {
		$payload   = '{"test": "data"}';
		$secret    = 'test_secret';
		$signature = hash_hmac( 'sha256', $payload, $secret );

		$result = $this->api_client->verify_webhook_signature( $payload, $signature, $secret );
		$this->assertTrue( $result );

		// Test with wrong signature
		$result = $this->api_client->verify_webhook_signature( $payload, 'wrong_signature', $secret );
		$this->assertFalse( $result );
	}

	/**
	 * Test cache clearing
	 */
	public function test_cache_clearing() {
		// Set some cached data
		set_transient( 'mirrorly_test_cache', 'test_data', 300 );

		$this->api_client->clear_cache();

		// Cache should be cleared
		$this->assertFalse( get_transient( 'mirrorly_test_cache' ) );
	}

	/**
	 * Test API configuration methods
	 */
	public function test_api_configuration_methods() {
		// Test setting API key
		$this->api_client->set_api_key( 'new_api_key' );
		$config = $this->api_client->get_config();
		$this->assertTrue( $config['has_api_key'] );

		// Test setting API URL
		$this->api_client->set_api_url( 'https://new-api.example.com/v1/' );
		$config = $this->api_client->get_config();
		$this->assertEquals( 'https://new-api.example.com/v1/', $config['api_url'] );

		// Test setting timeout
		$this->api_client->set_timeout( 60 );
		$config = $this->api_client->get_config();
		$this->assertEquals( 60, $config['timeout'] );
	}

	/**
	 * Test error handling for network failures
	 */
	public function test_network_error_handling() {
		// Mock network error
		add_filter(
			'pre_http_request',
			function () {
				return new WP_Error( 'http_request_failed', 'Network error' );
			}
		);

		$result = $this->api_client->check_limits();

		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'api_request_failed', $result->get_error_code() );

		// Clean up
		remove_all_filters( 'pre_http_request' );
	}

	/**
	 * Test error handling for invalid JSON responses
	 */
	public function test_invalid_json_error_handling() {
		// Mock invalid JSON response
		add_filter(
			'pre_http_request',
			function () {
				return array(
					'headers'  => array(),
					'body'     => 'Invalid JSON response',
					'response' => array(
						'code'    => 200,
						'message' => 'OK',
					),
					'cookies'  => array(),
					'filename' => null,
				);
			}
		);

		$result = $this->api_client->check_limits();

		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'invalid_json', $result->get_error_code() );

		// Clean up
		remove_all_filters( 'pre_http_request' );
	}

	/**
	 * Test multiple generation status checking
	 */
	public function test_multiple_generation_status_checking() {
		Mirrorly_API_Mock::set_mock_response(
			'generate/status/batch',
			array(
				'results' => array(
					'gen1' => array( 'status' => 'completed' ),
					'gen2' => array( 'status' => 'processing' ),
				),
			)
		);

		$result = $this->api_client->get_multiple_generation_status( array( 'gen1', 'gen2' ) );

		$this->assertIsArray( $result );
		$this->assertArrayHasKey( 'results', $result );
		$this->assertCount( 2, $result['results'] );
	}

	/**
	 * Test async image generation
	 */
	public function test_async_image_generation() {
		// Mock prerequisites
		Mirrorly_API_Mock::mock_rate_limit_check( true, 5 );
		Mirrorly_API_Mock::set_mock_response(
			'generate/image-async',
			array(
				'success'      => true,
				'generationId' => 'async_gen_123',
				'status'       => 'queued',
			)
		);

		$user_image    = Mirrorly_Test_Helpers::create_temp_image();
		$product_image = Mirrorly_Test_Helpers::create_temp_image();

		$result = $this->api_client->generate_image_async( $user_image, $product_image, 123 );

		$this->assertIsArray( $result );
		$this->assertTrue( $result['success'] );
		$this->assertArrayHasKey( 'generationId', $result );

		// Clean up
		unlink( $user_image );
		unlink( $product_image );
	}
}
