<?php
/**
 * Tests for Mirrorly_Admin class
 */

class Test_Mirrorly_Admin extends Mirrorly_Test_Case {

    private $admin;

    public function setUp(): void {
        parent::setUp();

        $this->admin = new Mirrorly_Admin();

        // Set up admin user
        Mirrorly_Test_Helpers::set_admin_user();

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
     * Test admin menu registration
     */
    public function test_admin_menu_registration() {
        global $menu, $submenu;

        // Trigger admin_menu action
        do_action('admin_menu');

        // Check if main menu item exists
        $menu_found = false;
        foreach ($menu as $menu_item) {
            if (isset($menu_item[2]) && $menu_item[2] === 'mirrorly-settings') {
                $menu_found = true;
                $this->assertEquals('Mirrorly', $menu_item[0]);
                break;
            }
        }

        $this->assertTrue($menu_found, 'Mirrorly admin menu should be registered');

        // Check submenu items
        $this->assertArrayHasKey('mirrorly-settings', $submenu);
        $this->assertCount(3, $submenu['mirrorly-settings']); // Settings, Stats, Help
    }

    /**
     * Test admin scripts enqueuing
     */
    public function test_admin_scripts_enqueuing() {
        global $wp_scripts, $wp_styles;

        // Simulate admin page
        set_current_screen('mirrorly_page_mirrorly-settings');

        // Trigger admin_enqueue_scripts
        do_action('admin_enqueue_scripts', 'mirrorly_page_mirrorly-settings');

        // Check if scripts are enqueued
        $this->assertTrue(wp_script_is('mirrorly-admin', 'enqueued'));
        $this->assertTrue(wp_style_is('mirrorly-admin', 'enqueued'));
        $this->assertTrue(wp_style_is('wp-color-picker', 'enqueued'));
    }

    /**
     * Test admin notices
     */
    public function test_admin_notices() {
        // Clear API key to trigger setup notice
        $this->set_plugin_option('api_key', '');

        ob_start();
        $this->admin->admin_notices();
        $output = ob_get_clean();

        $this->assertStringContainsString('necesitas configurar tu API key', $output);
        $this->assertStringContainsString('Configurar ahora', $output);
    }

    /**
     * Test options validation
     */
    public function test_options_validation() {
        $input = array(
            'license_key' => 'TEST-LICENSE-KEY',
            'api_key' => 'test_api_key',
            'custom_message' => 'Test message',
            'show_widget_position' => 'after_summary',
            'widget_colors' => array(
                'primary' => '#ff0000',
                'secondary' => '#00ff00',
                'text' => '#0000ff'
            )
        );

        // Mock successful license validation
        Mirrorly_API_Mock::mock_license_validation('pro_basic', true);

        $validated = $this->admin->validate_options($input);

        $this->assertEquals('test_api_key', $validated['api_key']);
        $this->assertEquals('Test message', $validated['custom_message']);
        $this->assertEquals('after_summary', $validated['show_widget_position']);
        $this->assertEquals('#ff0000', $validated['widget_colors']['primary']);
    }

    /**
     * Test invalid options validation
     */
    public function test_invalid_options_validation() {
        $input = array(
            'show_widget_position' => 'invalid_position',
            'widget_colors' => array(
                'primary' => 'invalid_color'
            )
        );

        $validated = $this->admin->validate_options($input);

        // Invalid position should not be saved
        $this->assertNotEquals('invalid_position', $validated['show_widget_position']);

        // Invalid color should not be saved
        $this->assertArrayNotHasKey('primary', $validated['widget_colors'] ?? array());
    }

    /**
     * Test AJAX license validation
     */
    public function test_ajax_validate_license() {
        Mirrorly_Test_Helpers::setup_ajax_environment();

        // Mock successful license validation
        Mirrorly_API_Mock::mock_pro_license_registration(true);

        $response = $this->mock_ajax_request('mirrorly_validate_license', array(
            'license_key' => 'TEST-PRO-LICENSE'
        ), 'mirrorly_admin_nonce');

        $data = Mirrorly_Test_Helpers::parse_ajax_response($response);
        $this->assertTrue($data['success']);
    }

    /**
     * Test AJAX API connection test
     */
    public function test_ajax_test_api_connection() {
        Mirrorly_Test_Helpers::setup_ajax_environment();

        // Mock successful API connection
        Mirrorly_API_Mock::mock_rate_limit_check(true, 10);

        $response = $this->mock_ajax_request('mirrorly_test_api_connection', array(), 'mirrorly_admin_nonce');

        $data = Mirrorly_Test_Helpers::parse_ajax_response($response);
        $this->assertTrue($data['success']);
    }

    /**
     * Test AJAX load products
     */
    public function test_ajax_load_products() {
        Mirrorly_Test_Helpers::setup_ajax_environment();

        // Create test products
        $product1 = $this->create_test_product(array('post_title' => 'Product 1'));
        $product2 = $this->create_test_product(array('post_title' => 'Product 2'));

        $response = $this->mock_ajax_request('mirrorly_load_products', array(), 'mirrorly_admin_nonce');

        $data = Mirrorly_Test_Helpers::parse_ajax_response($response);
        $this->assertTrue($data['success']);
        $this->assertIsArray($data['data']);
    }

    /**
     * Test AJAX search products
     */
    public function test_ajax_search_products() {
        Mirrorly_Test_Helpers::setup_ajax_environment();

        // Create test products
        $product1 = $this->create_test_product(array('post_title' => 'Red Shirt'));
        $product2 = $this->create_test_product(array('post_title' => 'Blue Pants'));

        $response = $this->mock_ajax_request('mirrorly_search_products', array(
            'query' => 'Red'
        ), 'mirrorly_admin_nonce');

        $data = Mirrorly_Test_Helpers::parse_ajax_response($response);
        $this->assertTrue($data['success']);
        $this->assertIsArray($data['data']);
    }

    /**
     * Test settings page rendering
     */
    public function test_settings_page_rendering() {
        // Activate PRO license for full feature testing
        Mirrorly_Test_Helpers::activate_license('pro_basic');

        ob_start();
        $this->admin->settings_page();
        $output = ob_get_clean();

        $this->assertStringContainsString('mirrorly-settings', $output);
        $this->assertStringContainsString('Configuración General', $output);
    }

    /**
     * Test stats page rendering
     */
    public function test_stats_page_rendering() {
        // Mock usage stats
        Mirrorly_API_Mock::mock_usage_stats(5, 10);

        ob_start();
        $this->admin->stats_page();
        $output = ob_get_clean();

        $this->assertStringContainsString('mirrorly-stats', $output);
    }

    /**
     * Test help page rendering
     */
    public function test_help_page_rendering() {
        ob_start();
        $this->admin->help_page();
        $output = ob_get_clean();

        $this->assertStringContainsString('mirrorly-help', $output);
    }

    /**
     * Test PRO settings visibility
     */
    public function test_pro_settings_visibility() {
        // Test with FREE license
        Mirrorly_Test_Helpers::activate_license('free');

        // Trigger admin_init to register settings
        do_action('admin_init');

        global $wp_settings_sections;

        // PRO section should not be registered for FREE users
        $this->assertArrayNotHasKey('mirrorly_pro', $wp_settings_sections['mirrorly_settings'] ?? array());

        // Test with PRO license
        Mirrorly_Test_Helpers::activate_license('pro_basic');

        // Re-initialize admin
        $this->admin = new Mirrorly_Admin();
        do_action('admin_init');

        // PRO section should be registered for PRO users
        $this->assertArrayHasKey('mirrorly_pro', $wp_settings_sections['mirrorly_settings'] ?? array());
    }

    /**
     * Test widget colors validation
     */
    public function test_widget_colors_validation() {
        $input = array(
            'widget_colors' => array(
                'primary' => '#ff0000',
                'secondary' => 'invalid',
                'text' => '#00ff00'
            )
        );

        $validated = $this->admin->validate_options($input);

        // Valid colors should be saved
        $this->assertEquals('#ff0000', $validated['widget_colors']['primary']);
        $this->assertEquals('#00ff00', $validated['widget_colors']['text']);

        // Invalid color should not be saved
        $this->assertArrayNotHasKey('secondary', $validated['widget_colors']);
    }

    /**
     * Test widget styling validation
     */
    public function test_widget_styling_validation() {
        $input = array(
            'widget_styling' => array(
                'border_radius' => '15',
                'button_style' => 'rounded',
                'animation' => 'fade',
                'shadow' => 'medium',
                'font_size' => 'large'
            )
        );

        $validated = $this->admin->validate_options($input);

        $this->assertEquals('15', $validated['widget_styling']['border_radius']);
        $this->assertEquals('rounded', $validated['widget_styling']['button_style']);
        $this->assertEquals('fade', $validated['widget_styling']['animation']);
    }

    /**
     * Test enabled products validation
     */
    public function test_enabled_products_validation() {
        $product1 = $this->create_test_product();
        $product2 = $this->create_test_product();

        $input = array(
            'enabled_products' => array($product1, $product2, 'invalid')
        );

        $validated = $this->admin->validate_options($input);

        $this->assertCount(2, $validated['enabled_products']);
        $this->assertContains($product1, $validated['enabled_products']);
        $this->assertContains($product2, $validated['enabled_products']);
        $this->assertNotContains('invalid', $validated['enabled_products']);
    }

    /**
     * Test unauthorized AJAX requests
     */
    public function test_unauthorized_ajax_requests() {
        Mirrorly_Test_Helpers::setup_ajax_environment();

        // Set user without proper capabilities
        Mirrorly_Test_Helpers::set_customer_user();

        $response = $this->mock_ajax_request('mirrorly_validate_license', array(
            'license_key' => 'TEST-LICENSE'
        ), 'mirrorly_admin_nonce');

        // Should fail due to insufficient capabilities
        $this->assertStringContainsString('No tienes permisos', $response);
    }
}