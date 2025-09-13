<?php
/**
 * Tests for Mirrorly_Frontend class
 */

class Test_Mirrorly_Frontend extends Mirrorly_Test_Case {

	private $frontend;
	private $product_id;
	private $image_id;

	public function setUp(): void {
		parent::setUp();

		$this->frontend = new Mirrorly_Frontend();

		// Create test product with image
		$product_data     = Mirrorly_Test_Helpers::create_wc_product_with_image();
		$this->product_id = $product_data['product_id'];
		$this->image_id   = $product_data['image_id'];

		// Enable Mirrorly for the product
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $this->product_id, $this->image_id );

		// Install API mock
		Mirrorly_API_Mock::install();

		// Set up global $product
		global $product;
		$product = wc_get_product( $this->product_id );
	}

	public function tearDown(): void {
		Mirrorly_API_Mock::uninstall();
		Mirrorly_API_Mock::clear_mock_responses();
		Mirrorly_Test_Helpers::reset_wp_environment();
		Mirrorly_Test_Helpers::cleanup_temp_files();

		parent::tearDown();
	}

	/**
	 * Test frontend initialization
	 */
	public function test_frontend_initialization() {
		// Mock product page
		$GLOBALS['wp_query']->is_single  = true;
		$GLOBALS['wp_query']->is_product = true;

		// Trigger init
		do_action( 'init' );

		// Check if hooks are registered
		$this->assertHookRegistered( 'wp_enqueue_scripts', array( $this->frontend, 'enqueue_scripts' ) );
		$this->assertHookRegistered( 'woocommerce_single_product_summary', array( $this->frontend, 'display_widget' ) );
	}

	/**
	 * Test script enqueuing on product pages
	 */
	public function test_script_enqueuing_on_product_page() {
		global $wp_scripts, $wp_styles;

		// Mock product page
		$GLOBALS['wp_query']->is_single  = true;
		$GLOBALS['wp_query']->is_product = true;

		// Trigger script enqueuing
		$this->frontend->enqueue_scripts();

		// Check if scripts are enqueued
		$this->assertTrue( wp_script_is( 'mirrorly-frontend', 'enqueued' ) );
		$this->assertTrue( wp_style_is( 'mirrorly-frontend', 'enqueued' ) );

		// Check localized script data
		$localized_data = $wp_scripts->get_data( 'mirrorly-frontend', 'data' );
		$this->assertStringContainsString( 'mirrorly_frontend', $localized_data );
	}

	/**
	 * Test widget display
	 */
	public function test_widget_display() {
		global $product;
		$product = wc_get_product( $this->product_id );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'mirrorly-widget', $output );
		$this->assertStringContainsString( 'data-product-id="' . $this->product_id . '"', $output );
	}

	/**
	 * Test widget not displayed when disabled
	 */
	public function test_widget_not_displayed_when_disabled() {
		// Disable Mirrorly for the product
		Mirrorly_Test_Helpers::disable_mirrorly_for_product( $this->product_id );

		global $product;
		$product = wc_get_product( $this->product_id );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertEmpty( $output );
	}

	/**
	 * Test widget display for FREE license with product limits
	 */
	public function test_widget_display_free_license_limits() {
		// Activate FREE license
		Mirrorly_Test_Helpers::activate_license( 'free' );

		// Create multiple products
		$product2 = $this->create_test_product();
		$product3 = $this->create_test_product();
		$product4 = $this->create_test_product();
		$product5 = $this->create_test_product();

		// Enable Mirrorly for all products
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $product2 );
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $product3 );
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $product4 );
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $product5 );

		// Test first product (should show)
		global $product;
		$product = wc_get_product( $this->product_id );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'mirrorly-widget', $output );

		// Test 5th product (should not show due to FREE limit of 3)
		$product = wc_get_product( $product5 );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertEmpty( $output );
	}

	/**
	 * Test AJAX image generation
	 */
	public function test_ajax_image_generation() {
		Mirrorly_Test_Helpers::setup_ajax_environment();
		Mirrorly_Test_Helpers::set_customer_user();

		// Mock successful image generation
		Mirrorly_API_Mock::mock_image_generation( true );
		Mirrorly_API_Mock::mock_rate_limit_check( true, 5 );

		// Create test image file
		$test_image = Mirrorly_Test_Helpers::create_temp_image();
		Mirrorly_Test_Helpers::mock_file_upload( $test_image );

		$response = $this->mock_ajax_request(
			'mirrorly_generate_image',
			array(
				'product_id' => $this->product_id,
				'style'      => 'realistic',
			),
			'mirrorly_frontend_nonce'
		);

		$data = Mirrorly_Test_Helpers::parse_ajax_response( $response );
		$this->assertTrue( $data['success'] );
		$this->assertArrayHasKey( 'image_url', $data['data'] );
	}

	/**
	 * Test AJAX image generation with invalid file
	 */
	public function test_ajax_image_generation_invalid_file() {
		Mirrorly_Test_Helpers::setup_ajax_environment();
		Mirrorly_Test_Helpers::set_customer_user();

		// Mock file upload with invalid file
		$_FILES['user_image'] = array(
			'name'     => 'test.txt',
			'type'     => 'text/plain',
			'tmp_name' => '/tmp/invalid',
			'error'    => UPLOAD_ERR_OK,
			'size'     => 100,
		);

		$response = $this->mock_ajax_request(
			'mirrorly_generate_image',
			array(
				'product_id' => $this->product_id,
			),
			'mirrorly_frontend_nonce'
		);

		$data = Mirrorly_Test_Helpers::parse_ajax_response( $response );
		$this->assertFalse( $data['success'] );
		$this->assertStringContainsString( 'válida', $data['data'] );
	}

	/**
	 * Test AJAX image generation with rate limit exceeded
	 */
	public function test_ajax_image_generation_rate_limit_exceeded() {
		Mirrorly_Test_Helpers::setup_ajax_environment();
		Mirrorly_Test_Helpers::set_customer_user();

		// Simulate rate limit exceeded
		Mirrorly_Test_Helpers::simulate_rate_limit_exceeded();

		// Create test image file
		$test_image = Mirrorly_Test_Helpers::create_temp_image();
		Mirrorly_Test_Helpers::mock_file_upload( $test_image );

		$response = $this->mock_ajax_request(
			'mirrorly_generate_image',
			array(
				'product_id' => $this->product_id,
			),
			'mirrorly_frontend_nonce'
		);

		$data = Mirrorly_Test_Helpers::parse_ajax_response( $response );
		$this->assertFalse( $data['success'] );
		$this->assertStringContainsString( 'límite', $data['data'] );
	}

	/**
	 * Test AJAX image generation without required data
	 */
	public function test_ajax_image_generation_missing_data() {
		Mirrorly_Test_Helpers::setup_ajax_environment();
		Mirrorly_Test_Helpers::set_customer_user();

		$response = $this->mock_ajax_request( 'mirrorly_generate_image', array(), 'mirrorly_frontend_nonce' );

		$data = Mirrorly_Test_Helpers::parse_ajax_response( $response );
		$this->assertFalse( $data['success'] );
		$this->assertStringContainsString( 'incompletos', $data['data'] );
	}

	/**
	 * Test AJAX generation status check
	 */
	public function test_ajax_generation_status_check() {
		Mirrorly_Test_Helpers::setup_ajax_environment();
		Mirrorly_Test_Helpers::set_customer_user();

		// Mock generation status response
		Mirrorly_API_Mock::set_mock_response(
			'generate/status/test123',
			array(
				'status'   => 'completed',
				'imageUrl' => 'https://example.com/result.jpg',
			)
		);

		$response = $this->mock_ajax_request(
			'mirrorly_check_generation_status',
			array(
				'generation_id' => 'test123',
			),
			'mirrorly_frontend_nonce'
		);

		$data = Mirrorly_Test_Helpers::parse_ajax_response( $response );
		$this->assertTrue( $data['success'] );
	}

	/**
	 * Test image validation
	 */
	public function test_image_validation() {
		// Create valid test image
		$valid_image = Mirrorly_Test_Helpers::create_temp_image();

		$file_data = array(
			'name'     => 'test.jpg',
			'type'     => 'image/jpeg',
			'tmp_name' => $valid_image,
			'error'    => UPLOAD_ERR_OK,
			'size'     => filesize( $valid_image ),
		);

		$reflection = new ReflectionClass( $this->frontend );
		$method     = $reflection->getMethod( 'validate_uploaded_image' );
		$method->setAccessible( true );

		$result = $method->invoke( $this->frontend, $file_data );
		$this->assertTrue( $result );

		// Test with oversized file
		$file_data['size'] = 10 * 1024 * 1024; // 10MB
		$result            = $method->invoke( $this->frontend, $file_data );
		$this->assertInstanceOf( 'WP_Error', $result );
	}

	/**
	 * Test image processing
	 */
	public function test_image_processing() {
		$test_image = Mirrorly_Test_Helpers::create_temp_image( 2000, 2000 ); // Large image

		$file_data = array(
			'name'     => 'large_test.jpg',
			'type'     => 'image/jpeg',
			'tmp_name' => $test_image,
			'error'    => UPLOAD_ERR_OK,
			'size'     => filesize( $test_image ),
		);

		$reflection = new ReflectionClass( $this->frontend );
		$method     = $reflection->getMethod( 'process_uploaded_image' );
		$method->setAccessible( true );

		$result = $method->invoke( $this->frontend, $file_data );

		$this->assertIsString( $result );
		$this->assertTrue( file_exists( $result ) );

		// Check if image was resized
		$image_info = getimagesize( $result );
		$this->assertLessThanOrEqual( 1024, $image_info[0] );
		$this->assertLessThanOrEqual( 1024, $image_info[1] );

		// Clean up
		unlink( $result );
	}

	/**
	 * Test widget display with custom message
	 */
	public function test_widget_display_custom_message() {
		// Set custom message for product
		update_post_meta( $this->product_id, '_mirrorly_custom_message', 'Custom product message' );

		global $product;
		$product = wc_get_product( $this->product_id );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'Custom product message', $output );
	}

	/**
	 * Test widget display with PRO styling
	 */
	public function test_widget_display_pro_styling() {
		// Activate PRO license
		Mirrorly_Test_Helpers::activate_license( 'pro_basic' );

		// Set custom styling
		$this->set_plugin_option(
			'widget_styling',
			array(
				'border_radius' => '12',
				'button_style'  => 'pill',
				'animation'     => 'slide',
				'shadow'        => 'heavy',
			)
		);

		global $product;
		$product = wc_get_product( $this->product_id );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'mirrorly-widget', $output );
		// Additional styling checks could be added here
	}

	/**
	 * Test cleanup of temporary files
	 */
	public function test_cleanup_temp_files() {
		// Create some temporary files
		$upload_dir = wp_upload_dir();
		$temp_dir   = $upload_dir['basedir'] . '/mirrorly-temp/';
		wp_mkdir_p( $temp_dir );

		$old_file = $temp_dir . 'old_file.jpg';
		$new_file = $temp_dir . 'new_file.jpg';

		file_put_contents( $old_file, 'test' );
		file_put_contents( $new_file, 'test' );

		// Make old file appear old
		touch( $old_file, time() - 7200 ); // 2 hours ago

		// Run cleanup
		Mirrorly_Frontend::cleanup_temp_files();

		// Old file should be deleted, new file should remain
		$this->assertFalse( file_exists( $old_file ) );
		$this->assertTrue( file_exists( $new_file ) );

		// Clean up
		unlink( $new_file );
		rmdir( $temp_dir );
	}

	/**
	 * Test widget not displayed without product image
	 */
	public function test_widget_not_displayed_without_image() {
		// Create product without image
		$product_without_image = $this->create_test_product();
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $product_without_image );

		global $product;
		$product = wc_get_product( $product_without_image );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertEmpty( $output );
	}

	/**
	 * Test AJAX nonce validation
	 */
	public function test_ajax_nonce_validation() {
		Mirrorly_Test_Helpers::setup_ajax_environment();
		Mirrorly_Test_Helpers::set_customer_user();

		// Create test image file
		$test_image = Mirrorly_Test_Helpers::create_temp_image();
		Mirrorly_Test_Helpers::mock_file_upload( $test_image );

		// Try without nonce
		$response = $this->mock_ajax_request(
			'mirrorly_generate_image',
			array(
				'product_id' => $this->product_id,
			)
		);

		// Should fail due to missing nonce
		$this->assertStringContainsString( 'nonce', $response );
	}
}
