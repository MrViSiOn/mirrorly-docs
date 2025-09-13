<?php
/**
 * PHPUnit bootstrap file for Mirrorly WordPress Plugin tests
 *
 * @package Mirrorly
 */

// Define test environment.
define( 'MIRRORLY_TESTING', true );

// WordPress test environment setup.
$_tests_dir = getenv( 'WP_TESTS_DIR' );
if ( ! $_tests_dir ) {
	$_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

// Give access to tests_add_filter() function.
require_once $_tests_dir . '/includes/functions.php';

/**
 * Manually load the plugin being tested
 */
function _manually_load_plugin() {
	// Load WooCommerce first (if available).
	if ( file_exists( WP_PLUGIN_DIR . '/woocommerce/woocommerce.php' ) ) {
		require_once WP_PLUGIN_DIR . '/woocommerce/woocommerce.php';
	}

	// Load our plugin.
	require dirname( __DIR__ ) . '/mirrorly.php';
}
tests_add_filter( 'muplugins_loaded', '_manually_load_plugin' );

// Start up the WP testing environment.
require $_tests_dir . '/includes/bootstrap.php';

// Include our test case classes.
require_once __DIR__ . '/includes/class-mirrorly-test-case.php';
require_once __DIR__ . '/includes/class-mirrorly-api-mock.php';
require_once __DIR__ . '/includes/class-mirrorly-test-helpers.php';
