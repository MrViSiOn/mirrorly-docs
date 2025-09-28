<?php
/**
 * Mirrorly Cron Manager
 *
 * Handles scheduled tasks for the Mirrorly plugin.
 *
 * @package Mirrorly
 * @since   1.0.0
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Mirrorly_Cron_Manager
 *
 * Manages WordPress cron jobs for Mirrorly plugin.
 */
class Mirrorly_Cron_Manager {

	/**
	 * Cron hook name for daily cleanup
	 *
	 * @var string
	 */
	const DAILY_CLEANUP_HOOK = 'mirrorly_daily_cleanup';

	/**
	 * Initialize the cron manager
	 */
	public function __construct() {
		// Hook into WordPress cron system
		add_action( self::DAILY_CLEANUP_HOOK, array( $this, 'run_daily_cleanup' ) );
	}

	/**
	 * Schedule the daily cleanup cron job
	 *
	 * Called when plugin is activated
	 */
	public static function schedule_daily_cleanup() {
		// Check if the event is already scheduled
		if ( ! wp_next_scheduled( self::DAILY_CLEANUP_HOOK ) ) {
			// Schedule daily cleanup at 3 AM
			wp_schedule_event( 
				strtotime( 'tomorrow 3:00 AM' ), 
				'daily', 
				self::DAILY_CLEANUP_HOOK 
			);
			
			error_log( 'Mirrorly: Daily cleanup cron job scheduled' );
		}
	}

	/**
	 * Unschedule the daily cleanup cron job
	 *
	 * Called when plugin is deactivated
	 */
	public static function unschedule_daily_cleanup() {
		// Get the timestamp of the next scheduled event
		$timestamp = wp_next_scheduled( self::DAILY_CLEANUP_HOOK );
		
		if ( $timestamp ) {
			// Unschedule the event
			wp_unschedule_event( $timestamp, self::DAILY_CLEANUP_HOOK );
			error_log( 'Mirrorly: Daily cleanup cron job unscheduled' );
		}
		
		// Clear all scheduled events for this hook (safety measure)
		wp_clear_scheduled_hook( self::DAILY_CLEANUP_HOOK );
	}

	/**
	 * Run the daily cleanup process
	 *
	 * This method is called by WordPress cron
	 */
	public function run_daily_cleanup() {
		try {
			// Initialize the image manager
			$image_manager = new Mirrorly_Image_Manager();
			
			// Get stats before cleanup
			$stats_before = array(
				'count' => $image_manager->get_images_count(),
				'size'  => $image_manager->get_total_size()
			);
			
			// Clean up old images (older than 24 hours)
			$cleaned_count = $image_manager->cleanup_old_images( 24 * HOUR_IN_SECONDS );
			
			// Get stats after cleanup
			$stats_after = array(
				'count' => $image_manager->get_images_count(),
				'size'  => $image_manager->get_total_size()
			);
			
			// Log cleanup results
			error_log( sprintf(
				'Mirrorly Daily Cleanup: Removed %d images. Before: %d files (%.2f MB), After: %d files (%.2f MB)',
				$cleaned_count,
				$stats_before['count'],
				$stats_before['size'] / (1024 * 1024),
				$stats_after['count'],
				$stats_after['size'] / (1024 * 1024)
			) );
			
			// Update last cleanup timestamp in options
			update_option( 'mirrorly_last_cleanup', current_time( 'timestamp' ) );
			
		} catch ( Exception $e ) {
			// Log any errors that occur during cleanup
			error_log( 'Mirrorly Daily Cleanup Error: ' . $e->getMessage() );
		}
	}

	/**
	 * Get the next scheduled cleanup time
	 *
	 * @return int|false Timestamp of next cleanup or false if not scheduled
	 */
	public static function get_next_cleanup_time() {
		return wp_next_scheduled( self::DAILY_CLEANUP_HOOK );
	}

	/**
	 * Get the last cleanup time
	 *
	 * @return int|false Timestamp of last cleanup or false if never run
	 */
	public static function get_last_cleanup_time() {
		return get_option( 'mirrorly_last_cleanup', false );
	}

	/**
	 * Check if cleanup is overdue (more than 25 hours since last run)
	 *
	 * @return bool True if cleanup is overdue
	 */
	public static function is_cleanup_overdue() {
		$last_cleanup = self::get_last_cleanup_time();
		
		if ( ! $last_cleanup ) {
			return true; // Never run before
		}
		
		// Check if more than 25 hours have passed (allowing 1 hour buffer)
		return ( current_time( 'timestamp' ) - $last_cleanup ) > ( 25 * HOUR_IN_SECONDS );
	}

	/**
	 * Manually trigger cleanup (for admin use)
	 *
	 * @return array Cleanup results
	 */
	public function manual_cleanup() {
		try {
			$image_manager = new Mirrorly_Image_Manager();
			
			$stats_before = array(
				'count' => $image_manager->get_images_count(),
				'size'  => $image_manager->get_total_size()
			);
			
			$cleaned_count = $image_manager->cleanup_old_images( 24 * HOUR_IN_SECONDS );
			
			$stats_after = array(
				'count' => $image_manager->get_images_count(),
				'size'  => $image_manager->get_total_size()
			);
			
			update_option( 'mirrorly_last_cleanup', current_time( 'timestamp' ) );
			
			return array(
				'success'        => true,
				'cleaned_count'  => $cleaned_count,
				'stats_before'   => $stats_before,
				'stats_after'    => $stats_after,
				'message'        => sprintf(
					'Cleanup completed. Removed %d images.',
					$cleaned_count
				)
			);
			
		} catch ( Exception $e ) {
			return array(
				'success' => false,
				'message' => 'Cleanup failed: ' . $e->getMessage()
			);
		}
	}

	/**
	 * Get cleanup statistics
	 *
	 * @return array Cleanup statistics
	 */
	public static function get_cleanup_stats() {
		$image_manager = new Mirrorly_Image_Manager();
		
		return array(
			'current_images_count' => $image_manager->get_images_count(),
			'current_total_size'   => $image_manager->get_total_size(),
			'last_cleanup'         => self::get_last_cleanup_time(),
			'next_cleanup'         => self::get_next_cleanup_time(),
			'is_overdue'           => self::is_cleanup_overdue(),
			'is_scheduled'         => (bool) wp_next_scheduled( self::DAILY_CLEANUP_HOOK )
		);
	}
}