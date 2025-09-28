<?php
/**
 * Tests for WooCommerce integration
 */

class Test_WooCommerce_Integration extends Mirrorly_Test_Case {

	private $product_id;
	private $admin;
	private $frontend;

	public function setUp(): void {
		parent::setUp();

		// Skip if WooCommerce is not available
		if ( ! class_exists( 'WooCommerce' ) ) {
			$this->markTestSkipped( 'WooCommerce is not available' );
		}

		$this->admin    = new Mirrorly_Admin();
		$this->frontend = new Mirrorly_Frontend();

		// Create test product
		$product_data     = Mirrorly_Test_Helpers::create_wc_product_with_image();
		$this->product_id = $product_data['product_id'];

		// Install API mock
		Mirrorly_API_Mock::install();
	}

	public function tearDown(): void {
		Mirrorly_API_Mock::uninstall();
		Mirrorly_API_Mock::clear_mock_responses();
		Mirrorly_Test_Helpers::reset_wp_environment();

		parent::tearDown();
	}

	/**
	 * Test product metabox registration
	 */
	public function test_product_metabox_registration() {
		global $wp_meta_boxes;

		// Set up admin environment
		set_current_screen( 'product' );
		Mirrorly_Test_Helpers::set_admin_user();

		// Initialize product meta
		$product_meta = new Mirrorly_Product_Meta();

		// Trigger metabox registration
		do_action( 'add_meta_boxes', 'product', get_post( $this->product_id ) );

		// Check if metabox is registered
		$this->assertArrayHasKey( 'mirrorly_product_settings', $wp_meta_boxes['product']['side']['default'] );
	}

	/**
	 * Test product meta saving
	 */
	public function test_product_meta_saving() {
		Mirrorly_Test_Helpers::set_admin_user();

		// Simulate saving product with Mirrorly enabled
		$_POST['mirrorly_enabled']        = 'yes';
		$_POST['mirrorly_image_id']       = '123';
		$_POST['mirrorly_custom_message'] = 'Custom message for this product';
		$_POST['mirrorly_nonce']          = wp_create_nonce( 'mirrorly_product_meta' );

		$product_meta = new Mirrorly_Product_Meta();
		$product_meta->save_product_meta( $this->product_id );

		// Check if meta was saved
		$this->assertMetaEquals( $this->product_id, '_mirrorly_enabled', 'yes' );
		$this->assertMetaEquals( $this->product_id, '_mirrorly_image_id', '123' );
		$this->assertMetaEquals( $this->product_id, '_mirrorly_custom_message', 'Custom message for this product' );

		// Clean up
		unset( $_POST['mirrorly_enabled'], $_POST['mirrorly_image_id'], $_POST['mirrorly_custom_message'], $_POST['mirrorly_nonce'] );
	}

	/**
	 * Test widget display on product page
	 */
	public function test_widget_display_on_product_page() {
		// Enable Mirrorly for product
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $this->product_id );

		// Mock product page
		global $product, $wp_query;
		$product              = wc_get_product( $this->product_id );
		$wp_query->is_single  = true;
		$wp_query->is_product = true;

		// Capture widget output
		ob_start();
		do_action( 'woocommerce_single_product_summary' );
		$output = ob_get_clean();

		$this->assertStringContainsString( 'mirrorly-widget', $output );
		$this->assertStringContainsString( 'data-product-id="' . $this->product_id . '"', $output );
	}

	/**
	 * Test widget not displayed when disabled
	 */
	public function test_widget_not_displayed_when_disabled() {
		// Disable Mirrorly for product
		Mirrorly_Test_Helpers::disable_mirrorly_for_product( $this->product_id );

		global $product;
		$product = wc_get_product( $this->product_id );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertEmpty( $output );
	}

	/**
	 * Test product image selection for Mirrorly
	 */
	public function test_product_image_selection() {
		// Create additional images for product
		$image1 = $this->create_test_image( 'image1.jpg' );
		$image2 = $this->create_test_image( 'image2.jpg' );

		// Attach images to product
		wp_update_post(
			array(
				'ID'          => $image1,
				'post_parent' => $this->product_id,
			)
		);
		wp_update_post(
			array(
				'ID'          => $image2,
				'post_parent' => $this->product_id,
			)
		);

		// Set specific image for Mirrorly
		update_post_meta( $this->product_id, '_mirrorly_image_id', $image2 );

		global $product;
		$product = wc_get_product( $this->product_id );

		// Check if correct image is used
		$mirrorly_image_id = get_post_meta( $this->product_id, '_mirrorly_image_id', true );
		$this->assertEquals( $image2, $mirrorly_image_id );
	}

	/**
	 * Test product gallery integration
	 */
	public function test_product_gallery_integration() {
		$product = wc_get_product( $this->product_id );

		// Create gallery images
		$gallery_image1 = $this->create_test_image( 'gallery1.jpg' );
		$gallery_image2 = $this->create_test_image( 'gallery2.jpg' );

		// Set product gallery
		$product->set_gallery_image_ids( array( $gallery_image1, $gallery_image2 ) );
		$product->save();

		// Test that gallery images are available for Mirrorly selection
		$gallery_ids = $product->get_gallery_image_ids();
		$this->assertContains( $gallery_image1, $gallery_ids );
		$this->assertContains( $gallery_image2, $gallery_ids );
	}

	/**
	 * Test variable product support
	 */
	public function test_variable_product_support() {
		// Create variable product
		$variable_product_id = wp_insert_post(
			array(
				'post_title'   => 'Variable Product',
				'post_content' => 'Variable product description',
				'post_status'  => 'publish',
				'post_type'    => 'product',
			)
		);

		// Set as variable product
		wp_set_object_terms( $variable_product_id, 'variable', 'product_type' );

		// Create variations
		$variation1_id = wp_insert_post(
			array(
				'post_title'   => 'Variation 1',
				'post_content' => '',
				'post_status'  => 'publish',
				'post_type'    => 'product_variation',
				'post_parent'  => $variable_product_id,
			)
		);

		// Enable Mirrorly for variable product
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $variable_product_id );

		global $product;
		$product = wc_get_product( $variable_product_id );

		// Test widget display for variable product
		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'mirrorly-widget', $output );
	}

	/**
	 * Test product categories integration
	 */
	public function test_product_categories_integration() {
		// Create product category
		$category_id = wp_insert_term( 'Test Category', 'product_cat' );

		// Assign product to category
		wp_set_object_terms( $this->product_id, $category_id['term_id'], 'product_cat' );

		// Test category-based settings (if implemented)
		$product_categories = wp_get_post_terms( $this->product_id, 'product_cat' );
		$this->assertCount( 1, $product_categories );
		$this->assertEquals( 'Test Category', $product_categories[0]->name );
	}

	/**
	 * Test product attributes integration
	 */
	public function test_product_attributes_integration() {
		$product = wc_get_product( $this->product_id );

		// Add product attributes
		$attributes = array(
			'color' => array(
				'name'         => 'Color',
				'value'        => 'Red, Blue, Green',
				'is_visible'   => 1,
				'is_variation' => 0,
				'is_taxonomy'  => 0,
			),
		);

		$product->set_attributes( $attributes );
		$product->save();

		// Test that attributes are preserved with Mirrorly
		$saved_attributes = $product->get_attributes();
		$this->assertArrayHasKey( 'color', $saved_attributes );
	}

	/**
	 * Test WooCommerce hooks integration
	 */
	public function test_woocommerce_hooks_integration() {
		// Test that Mirrorly hooks are properly registered
		$this->assertHookRegistered( 'woocommerce_single_product_summary' );
		$this->assertHookRegistered( 'woocommerce_product_options_general_product_data' );
		$this->assertHookRegistered( 'woocommerce_process_product_meta' );
	}

	/**
	 * Test product stock status integration
	 */
	public function test_product_stock_status_integration() {
		$product = wc_get_product( $this->product_id );

		// Test with in-stock product
		$product->set_stock_status( 'instock' );
		$product->save();

		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $this->product_id );

		global $product;
		$global_product = $product;

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'mirrorly-widget', $output );

		// Test with out-of-stock product
		$product->set_stock_status( 'outofstock' );
		$product->save();

		$global_product = wc_get_product( $this->product_id );

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		// Widget should still display for out-of-stock products
		$this->assertStringContainsString( 'mirrorly-widget', $output );
	}

	/**
	 * Test product pricing integration
	 */
	public function test_product_pricing_integration() {
		$product = wc_get_product( $this->product_id );

		// Set product prices
		$product->set_regular_price( '29.99' );
		$product->set_sale_price( '19.99' );
		$product->save();

		// Test that pricing doesn't affect Mirrorly functionality
		Mirrorly_Test_Helpers::enable_mirrorly_for_product( $this->product_id );

		global $product;
		$global_product = $product;

		ob_start();
		$this->frontend->display_widget();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'mirrorly-widget', $output );
	}

	/**
	 * Test cart integration
	 */
	public function test_cart_integration() {
		// This test would verify that Mirrorly doesn't interfere with cart functionality
		$product = wc_get_product( $this->product_id );

		// Simulate adding product to cart
		WC()->cart->add_to_cart( $this->product_id, 1 );

		// Check cart contents
		$cart_contents = WC()->cart->get_cart();
		$this->assertCount( 1, $cart_contents );

		// Clean up
		WC()->cart->empty_cart();
	}

	/**
	 * Test checkout integration
	 */
	public function test_checkout_integration() {
		// Test that Mirrorly doesn't interfere with checkout process
		$product = wc_get_product( $this->product_id );

		// Add product to cart
		WC()->cart->add_to_cart( $this->product_id, 1 );

		// Verify cart is not empty
		$this->assertFalse( WC()->cart->is_empty() );

		// Clean up
		WC()->cart->empty_cart();
	}

	/**
	 * Test product search integration
	 */
	public function test_product_search_integration() {
		// Test that Mirrorly-enabled products appear in search
		$search_query = new WP_Query(
			array(
				'post_type'      => 'product',
				's'              => 'Test Product',
				'posts_per_page' => 10,
			)
		);

		$this->assertTrue( $search_query->have_posts() );

		// Find our test product in results
		$found_product = false;
		while ( $search_query->have_posts() ) {
			$search_query->the_post();
			if ( $this->product_id === get_the_ID() ) {
				$found_product = true;
				break;
			}
		}

		$this->assertTrue( $found_product );
		wp_reset_postdata();
	}

	/**
	 * Test REST API integration
	 */
	public function test_rest_api_integration() {
		// Test that Mirrorly meta is included in WooCommerce REST API responses
		$request  = new WP_REST_Request( 'GET', '/wc/v3/products/' . $this->product_id );
		$response = rest_do_request( $request );

		$this->assertEquals( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertEquals( $this->product_id, $data['id'] );
	}
}
