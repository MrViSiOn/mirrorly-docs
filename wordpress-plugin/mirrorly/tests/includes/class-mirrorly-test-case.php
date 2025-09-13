<?php
/**
 * Base test case for Mirrorly tests
 */

class Mirrorly_Test_Case extends WP_UnitTestCase {

    /**
     * Set up test environment
     */
    public function setUp(): void {
        parent::setUp();

        // Reset plugin options
        delete_option('mirrorly_options');

        // Clear any transients
        $this->clear_mirrorly_transients();

        // Set up default options
        $this->set_default_options();
    }

    /**
     * Tear down test environment
     */
    public function tearDown(): void {
        // Clean up after tests
        $this->clear_mirrorly_transients();
        delete_option('mirrorly_options');

        parent::tearDown();
    }

    /**
     * Clear all Mirrorly transients
     */
    protected function clear_mirrorly_transients() {
        global $wpdb;

        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_mirrorly_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_mirrorly_%'");
    }

    /**
     * Set default plugin options for testing
     */
    protected function set_default_options() {
        $default_options = array(
            'api_key' => 'test_api_key_123',
            'license_key' => '',
            'custom_message' => '¡Ve cómo te queda este producto!',
            'show_widget_position' => 'after_summary',
            'widget_colors' => array(
                'primary' => '#007cba',
                'secondary' => '#ffffff',
                'text' => '#333333'
            ),
            'widget_styling' => array(
                'border_radius' => '8',
                'button_style' => 'rounded',
                'animation' => 'fade',
                'shadow' => 'medium',
                'font_size' => 'medium'
            ),
            'enabled_products' => array(),
            'max_products' => 3
        );

        update_option('mirrorly_options', $default_options);
    }

    /**
     * Create a test product
     */
    protected function create_test_product($args = array()) {
        $default_args = array(
            'post_title' => 'Test Product',
            'post_content' => 'Test product description',
            'post_status' => 'publish',
            'post_type' => 'product'
        );

        $args = wp_parse_args($args, $default_args);
        $product_id = wp_insert_post($args);

        // Set as simple product
        wp_set_object_terms($product_id, 'simple', 'product_type');

        // Add basic product meta
        update_post_meta($product_id, '_price', '19.99');
        update_post_meta($product_id, '_regular_price', '19.99');
        update_post_meta($product_id, '_stock_status', 'instock');
        update_post_meta($product_id, '_manage_stock', 'no');

        return $product_id;
    }

    /**
     * Create a test image attachment
     */
    protected function create_test_image($filename = 'test-image.jpg') {
        $upload_dir = wp_upload_dir();
        $image_path = $upload_dir['path'] . '/' . $filename;

        // Create a simple test image (1x1 pixel)
        $image = imagecreate(100, 100);
        $white = imagecolorallocate($image, 255, 255, 255);
        imagefill($image, 0, 0, $white);
        imagejpeg($image, $image_path);
        imagedestroy($image);

        // Create attachment
        $attachment = array(
            'post_mime_type' => 'image/jpeg',
            'post_title' => 'Test Image',
            'post_content' => '',
            'post_status' => 'inherit'
        );

        $attachment_id = wp_insert_attachment($attachment, $image_path);

        // Generate attachment metadata
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $attachment_data = wp_generate_attachment_metadata($attachment_id, $image_path);
        wp_update_attachment_metadata($attachment_id, $attachment_data);

        return $attachment_id;
    }

    /**
     * Mock WordPress AJAX request
     */
    protected function mock_ajax_request($action, $data = array(), $nonce_action = null) {
        $_POST['action'] = $action;

        if ($nonce_action) {
            $_POST['nonce'] = wp_create_nonce($nonce_action);
        }

        foreach ($data as $key => $value) {
            $_POST[$key] = $value;
        }

        // Set up AJAX environment
        if (!defined('DOING_AJAX')) {
            define('DOING_AJAX', true);
        }

        // Capture output
        ob_start();

        try {
            do_action('wp_ajax_' . $action);
        } catch (WPAjaxDieContinueException $e) {
            // Expected for successful AJAX responses
        } catch (WPAjaxDieStopException $e) {
            // Expected for error responses
        }

        $response = ob_get_clean();

        // Clean up
        unset($_POST['action'], $_POST['nonce']);
        foreach ($data as $key => $value) {
            unset($_POST[$key]);
        }

        return $response;
    }

    /**
     * Assert that a response is a valid JSON success response
     */
    protected function assertAjaxSuccess($response, $message = '') {
        $data = json_decode($response, true);

        $this->assertIsArray($data, $message ?: 'Response should be valid JSON');
        $this->assertTrue($data['success'], $message ?: 'Response should indicate success');

        return $data;
    }

    /**
     * Assert that a response is a valid JSON error response
     */
    protected function assertAjaxError($response, $message = '') {
        $data = json_decode($response, true);

        $this->assertIsArray($data, $message ?: 'Response should be valid JSON');
        $this->assertFalse($data['success'], $message ?: 'Response should indicate error');

        return $data;
    }

    /**
     * Mock HTTP requests for API calls
     */
    protected function mock_http_request($url, $response_body, $response_code = 200) {
        add_filter('pre_http_request', function($preempt, $args, $url_param) use ($url, $response_body, $response_code) {
            if (strpos($url_param, $url) !== false) {
                return array(
                    'headers' => array(),
                    'body' => is_array($response_body) ? wp_json_encode($response_body) : $response_body,
                    'response' => array(
                        'code' => $response_code,
                        'message' => 'OK'
                    ),
                    'cookies' => array(),
                    'filename' => null
                );
            }
            return $preempt;
        }, 10, 3);
    }

    /**
     * Create a user with specific capabilities
     */
    protected function create_test_user($role = 'administrator') {
        $user_id = wp_insert_user(array(
            'user_login' => 'testuser_' . uniqid(),
            'user_email' => 'test_' . uniqid() . '@example.com',
            'user_pass' => 'password',
            'role' => $role
        ));

        return $user_id;
    }

    /**
     * Set current user for testing
     */
    protected function set_current_user($user_id) {
        wp_set_current_user($user_id);
    }

    /**
     * Assert that an option has a specific value
     */
    protected function assertOptionEquals($option_name, $expected_value, $message = '') {
        $actual_value = get_option($option_name);
        $this->assertEquals($expected_value, $actual_value, $message);
    }

    /**
     * Assert that a meta value exists and equals expected value
     */
    protected function assertMetaEquals($object_id, $meta_key, $expected_value, $meta_type = 'post', $message = '') {
        $actual_value = get_metadata($meta_type, $object_id, $meta_key, true);
        $this->assertEquals($expected_value, $actual_value, $message);
    }

    /**
     * Assert that a transient has a specific value
     */
    protected function assertTransientEquals($transient_name, $expected_value, $message = '') {
        $actual_value = get_transient($transient_name);
        $this->assertEquals($expected_value, $actual_value, $message);
    }

    /**
     * Assert that a hook is registered
     */
    protected function assertHookRegistered($hook_name, $callback = null, $priority = 10) {
        $this->assertTrue(has_action($hook_name), "Hook '{$hook_name}' should be registered");

        if ($callback) {
            $this->assertNotFalse(
                has_action($hook_name, $callback),
                "Callback should be registered for hook '{$hook_name}'"
            );
        }
    }

    /**
     * Get plugin option value
     */
    protected function get_plugin_option($key = null) {
        $options = get_option('mirrorly_options', array());

        if ($key === null) {
            return $options;
        }

        return isset($options[$key]) ? $options[$key] : null;
    }

    /**
     * Set plugin option value
     */
    protected function set_plugin_option($key, $value) {
        $options = get_option('mirrorly_options', array());
        $options[$key] = $value;
        update_option('mirrorly_options', $options);
    }
}