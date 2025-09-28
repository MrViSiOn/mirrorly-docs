<?php
/**
 * Image Manager Class
 *
 * Handles local storage and management of generated images
 *
 * @package Mirrorly
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class Mirrorly_Image_Manager {
    
    /**
     * Plugin uploads directory path
     */
    private $uploads_dir;
    
    /**
     * Plugin uploads directory URL
     */
    private $uploads_url;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->init_directories();
    }
    
    /**
     * Initialize upload directories
     */
    private function init_directories() {
        $plugin_dir = plugin_dir_path(dirname(__FILE__));
        $plugin_url = plugin_dir_url(dirname(__FILE__));
        
        $this->uploads_dir = $plugin_dir . 'uploads/mirrorly/';
        $this->uploads_url = $plugin_url . 'uploads/mirrorly/';
        
        // Create directory if it doesn't exist
        $this->create_upload_directory();
    }
    
    /**
     * Create upload directory with proper permissions
     */
    private function create_upload_directory() {
        if (!file_exists($this->uploads_dir)) {
            wp_mkdir_p($this->uploads_dir);
            
            // Create .htaccess to protect directory
            $htaccess_content = "# Protect Mirrorly uploads\n";
            $htaccess_content .= "<Files *.php>\n";
            $htaccess_content .= "Order allow,deny\n";
            $htaccess_content .= "Deny from all\n";
            $htaccess_content .= "</Files>\n";
            
            file_put_contents($this->uploads_dir . '.htaccess', $htaccess_content);
            
            // Create index.php to prevent directory listing
            file_put_contents($this->uploads_dir . 'index.php', '<?php // Silence is golden');
        }
    }
    
    /**
     * Download and save image from external URL
     *
     * @param string $image_url External image URL
     * @return string|false Local image URL on success, false on failure
     */
    public function save_image_from_url($image_url) {
        if (empty($image_url)) {
            return false;
        }
        
        // Generate unique filename
        $filename = $this->generate_unique_filename();
        $file_path = $this->uploads_dir . $filename;
        
        // Download image
        $response = wp_remote_get($image_url, array(
            'timeout' => 30,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            error_log('Mirrorly: Error downloading image - ' . $response->get_error_message());
            return false;
        }
        
        $image_data = wp_remote_retrieve_body($response);
        
        if (empty($image_data)) {
            error_log('Mirrorly: Empty image data received');
            return false;
        }
        
        // Validate image data
        if (!$this->is_valid_image($image_data)) {
            error_log('Mirrorly: Invalid image data');
            return false;
        }
        
        // Save image to local directory
        if (file_put_contents($file_path, $image_data) === false) {
            error_log('Mirrorly: Failed to save image to ' . $file_path);
            return false;
        }
        
        // Return local URL
        return $this->uploads_url . $filename;
    }
    
    /**
     * Generate unique filename for image
     *
     * @return string Unique filename
     */
    private function generate_unique_filename() {
        $timestamp = time();
        $hash = wp_generate_password(8, false, false);
        return 'mirrorly-' . $timestamp . '-' . $hash . '.jpg';
    }
    
    /**
     * Validate if data is a valid image
     *
     * @param string $image_data Image binary data
     * @return bool True if valid image, false otherwise
     */
    private function is_valid_image($image_data) {
        // Check if it's a valid image by trying to get image info
        $temp_file = wp_tempnam();
        file_put_contents($temp_file, $image_data);
        
        $image_info = @getimagesize($temp_file);
        unlink($temp_file);
        
        return $image_info !== false;
    }
    
    /**
     * Clean up old images (older than specified hours)
     *
     * @param int $hours Hours to keep images (default 24)
     * @return int Number of files deleted
     */
    public function cleanup_old_images($hours = 24) {
        if (!file_exists($this->uploads_dir)) {
            return 0;
        }
        
        $deleted_count = 0;
        $cutoff_time = time() - ($hours * 3600);
        
        $files = glob($this->uploads_dir . 'mirrorly-*.jpg');
        
        foreach ($files as $file) {
            $file_time = filemtime($file);
            
            if ($file_time < $cutoff_time) {
                if (unlink($file)) {
                    $deleted_count++;
                }
            }
        }
        
        error_log('Mirrorly: Cleaned up ' . $deleted_count . ' old images');
        return $deleted_count;
    }
    
    /**
     * Get total size of stored images in bytes
     *
     * @return int Total size in bytes
     */
    public function get_total_images_size() {
        if (!file_exists($this->uploads_dir)) {
            return 0;
        }
        
        $total_size = 0;
        $files = glob($this->uploads_dir . 'mirrorly-*.jpg');
        
        foreach ($files as $file) {
            $total_size += filesize($file);
        }
        
        return $total_size;
    }
    
    /**
     * Get count of stored images
     *
     * @return int Number of images
     */
    public function get_images_count() {
        if (!file_exists($this->uploads_dir)) {
            return 0;
        }
        
        $files = glob($this->uploads_dir . 'mirrorly-*.jpg');
        return count($files);
    }
    
    /**
     * Delete all stored images
     *
     * @return int Number of files deleted
     */
    public function delete_all_images() {
        if (!file_exists($this->uploads_dir)) {
            return 0;
        }
        
        $deleted_count = 0;
        $files = glob($this->uploads_dir . 'mirrorly-*.jpg');
        
        foreach ($files as $file) {
            if (unlink($file)) {
                $deleted_count++;
            }
        }
        
        return $deleted_count;
    }
}