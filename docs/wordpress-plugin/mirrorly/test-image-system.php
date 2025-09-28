<?php
/**
 * Test script for Mirrorly Image Management System
 * 
 * This script tests the image saving and cron functionality
 * Run this from WordPress admin or via WP-CLI
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
	require_once( '../../../wp-load.php' );
}

// Test Image Manager functionality
function test_mirrorly_image_system() {
	echo "<h2>Testing Mirrorly Image Management System</h2>\n";
	
	try {
		// Test 1: Initialize Image Manager
		echo "<h3>Test 1: Initialize Image Manager</h3>\n";
		$image_manager = new Mirrorly_Image_Manager();
		echo "✅ Image Manager initialized successfully\n<br>";
		
		// Test 2: Check directory creation
		echo "<h3>Test 2: Check Upload Directory</h3>\n";
		$upload_dir = $image_manager->get_upload_dir();
		if ( is_dir( $upload_dir ) ) {
			echo "✅ Upload directory exists: {$upload_dir}\n<br>";
		} else {
			echo "❌ Upload directory does not exist: {$upload_dir}\n<br>";
		}
		
		// Test 3: Check protection files
		echo "<h3>Test 3: Check Protection Files</h3>\n";
		if ( file_exists( $upload_dir . '/.htaccess' ) ) {
			echo "✅ .htaccess file exists\n<br>";
		} else {
			echo "❌ .htaccess file missing\n<br>";
		}
		
		if ( file_exists( $upload_dir . '/index.php' ) ) {
			echo "✅ index.php file exists\n<br>";
		} else {
			echo "❌ index.php file missing\n<br>";
		}
		
		// Test 4: Test image saving with a sample URL
		echo "<h3>Test 4: Test Image Saving (Mock)</h3>\n";
		// Create a simple test image data (1x1 pixel PNG)
		$test_image_data = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==');
		$test_filename = $image_manager->generate_filename();
		$test_path = $upload_dir . '/' . $test_filename;
		
		if ( file_put_contents( $test_path, $test_image_data ) ) {
			echo "✅ Test image saved successfully: {$test_filename}\n<br>";
			
			// Get URL for the test image
			$test_url = $image_manager->get_image_url( $test_filename );
			echo "📷 Test image URL: <a href='{$test_url}' target='_blank'>{$test_url}</a>\n<br>";
			
			// Clean up test image
			unlink( $test_path );
			echo "🧹 Test image cleaned up\n<br>";
		} else {
			echo "❌ Failed to save test image\n<br>";
		}
		
		// Test 5: Get current statistics
		echo "<h3>Test 5: Current Statistics</h3>\n";
		$count = $image_manager->get_images_count();
		$size = $image_manager->get_total_size();
		echo "📊 Current images: {$count} files\n<br>";
		echo "📊 Total size: " . number_format( $size / 1024, 2 ) . " KB\n<br>";
		
	} catch ( Exception $e ) {
		echo "❌ Error: " . $e->getMessage() . "\n<br>";
	}
}

// Test Cron Manager functionality
function test_mirrorly_cron_system() {
	echo "<h2>Testing Mirrorly Cron System</h2>\n";
	
	try {
		// Test 1: Initialize Cron Manager
		echo "<h3>Test 1: Initialize Cron Manager</h3>\n";
		$cron_manager = new Mirrorly_Cron_Manager();
		echo "✅ Cron Manager initialized successfully\n<br>";
		
		// Test 2: Check cron scheduling
		echo "<h3>Test 2: Check Cron Scheduling</h3>\n";
		$next_cleanup = Mirrorly_Cron_Manager::get_next_cleanup_time();
		if ( $next_cleanup ) {
			echo "✅ Next cleanup scheduled for: " . date( 'Y-m-d H:i:s', $next_cleanup ) . "\n<br>";
		} else {
			echo "⚠️ No cleanup scheduled. Scheduling now...\n<br>";
			Mirrorly_Cron_Manager::schedule_daily_cleanup();
			$next_cleanup = Mirrorly_Cron_Manager::get_next_cleanup_time();
			if ( $next_cleanup ) {
				echo "✅ Cleanup scheduled for: " . date( 'Y-m-d H:i:s', $next_cleanup ) . "\n<br>";
			} else {
				echo "❌ Failed to schedule cleanup\n<br>";
			}
		}
		
		// Test 3: Check last cleanup
		echo "<h3>Test 3: Check Last Cleanup</h3>\n";
		$last_cleanup = Mirrorly_Cron_Manager::get_last_cleanup_time();
		if ( $last_cleanup ) {
			echo "📅 Last cleanup: " . date( 'Y-m-d H:i:s', $last_cleanup ) . "\n<br>";
		} else {
			echo "📅 No previous cleanup recorded\n<br>";
		}
		
		// Test 4: Check if cleanup is overdue
		echo "<h3>Test 4: Check Cleanup Status</h3>\n";
		$is_overdue = Mirrorly_Cron_Manager::is_cleanup_overdue();
		if ( $is_overdue ) {
			echo "⚠️ Cleanup is overdue\n<br>";
		} else {
			echo "✅ Cleanup is up to date\n<br>";
		}
		
		// Test 5: Get cleanup statistics
		echo "<h3>Test 5: Cleanup Statistics</h3>\n";
		$stats = Mirrorly_Cron_Manager::get_cleanup_stats();
		echo "📊 Current images: {$stats['current_images_count']}\n<br>";
		echo "📊 Total size: " . number_format( $stats['current_total_size'] / 1024, 2 ) . " KB\n<br>";
		echo "📊 Is scheduled: " . ( $stats['is_scheduled'] ? 'Yes' : 'No' ) . "\n<br>";
		echo "📊 Is overdue: " . ( $stats['is_overdue'] ? 'Yes' : 'No' ) . "\n<br>";
		
	} catch ( Exception $e ) {
		echo "❌ Error: " . $e->getMessage() . "\n<br>";
	}
}

// Test manual cleanup
function test_manual_cleanup() {
	echo "<h2>Testing Manual Cleanup</h2>\n";
	
	try {
		$cron_manager = new Mirrorly_Cron_Manager();
		$result = $cron_manager->manual_cleanup();
		
		if ( $result['success'] ) {
			echo "✅ Manual cleanup successful\n<br>";
			echo "📊 " . $result['message'] . "\n<br>";
		} else {
			echo "❌ Manual cleanup failed: " . $result['message'] . "\n<br>";
		}
		
	} catch ( Exception $e ) {
		echo "❌ Error: " . $e->getMessage() . "\n<br>";
	}
}

// Run all tests if accessed directly
if ( ! defined( 'WP_CLI' ) && ( ! isset( $_GET['action'] ) || $_GET['action'] === 'all' ) ) {
	echo "<!DOCTYPE html><html><head><title>Mirrorly System Test</title></head><body>";
	echo "<h1>Mirrorly Image Management System Test</h1>";
	echo "<p>Testing all components...</p>";
	
	test_mirrorly_image_system();
	test_mirrorly_cron_system();
	
	if ( isset( $_GET['cleanup'] ) && $_GET['cleanup'] === 'true' ) {
		test_manual_cleanup();
	}
	
	echo "<hr>";
	echo "<p><a href='?action=all'>Run All Tests</a> | <a href='?action=all&cleanup=true'>Run All Tests + Manual Cleanup</a></p>";
	echo "</body></html>";
}

// WP-CLI command support
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command( 'mirrorly test-images', 'test_mirrorly_image_system' );
	WP_CLI::add_command( 'mirrorly test-cron', 'test_mirrorly_cron_system' );
	WP_CLI::add_command( 'mirrorly cleanup', 'test_manual_cleanup' );
}