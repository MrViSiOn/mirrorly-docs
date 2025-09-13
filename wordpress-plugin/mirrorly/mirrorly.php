<?php
/**
 * Plugin Name: Mirrorly - AI Product Visualization
 * Plugin URI: https://mirrorly.com
 * Description: Permite a los usuarios visualizarse usando productos mediante inteligencia artificial. Integra con Google Generative AI para generar imágenes realistas.
 * Version: 1.0.0
 * Author: Mirrorly Team
 * Author URI: https://mirrorly.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: mirrorly
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('MIRRORLY_VERSION', '1.0.0');
define('MIRRORLY_PLUGIN_FILE', __FILE__);
define('MIRRORLY_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MIRRORLY_PLUGIN_URL', plugin_dir_url(__FILE__));
define('MIRRORLY_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Check if WooCommerce is active
if (!in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
    add_action('admin_notices', 'mirrorly_woocommerce_missing_notice');
    return;
}

/**
 * Notice when WooCommerce is not active
 */
function mirrorly_woocommerce_missing_notice() {
    echo '<div class="error"><p><strong>' . sprintf(esc_html__('Mirrorly requiere que WooCommerce esté instalado y activado. Puedes descargar %s aquí.', 'mirrorly'), '<a href="https://woocommerce.com/" target="_blank">WooCommerce</a>') . '</strong></p></div>';
}

// Autoloader for plugin classes
spl_autoload_register('mirrorly_autoloader');

function mirrorly_autoloader($class_name) {
    if (strpos($class_name, 'Mirrorly_') !== 0) {
        return;
    }

    $class_file = str_replace('_', '-', strtolower($class_name));
    $class_file = str_replace('mirrorly-', '', $class_file);
    $file_path = MIRRORLY_PLUGIN_DIR . 'includes/class-' . $class_file . '.php';

    if (file_exists($file_path)) {
        require_once $file_path;
    }
}

/**
 * Main Mirrorly Class
 */
final class Mirrorly {

    /**
     * The single instance of the class
     */
    protected static $_instance = null;

    /**
     * Plugin version
     */
    public $version = MIRRORLY_VERSION;

    /**
     * API Client instance
     */
    public $api_client = null;

    /**
     * Admin instance
     */
    public $admin = null;

    /**
     * Frontend instance
     */
    public $frontend = null;

    /**
     * License manager instance
     */
    public $license = null;

    /**
     * Main Mirrorly Instance
     */
    public static function instance() {
        if (is_null(self::$_instance)) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }

    /**
     * Cloning is forbidden
     */
    public function __clone() {
        wc_doing_it_wrong(__FUNCTION__, __('Cloning is forbidden.', 'mirrorly'), '1.0.0');
    }

    /**
     * Unserializing instances of this class is forbidden
     */
    public function __wakeup() {
        wc_doing_it_wrong(__FUNCTION__, __('Unserializing instances is forbidden.', 'mirrorly'), '1.0.0');
    }

    /**
     * Mirrorly Constructor
     */
    public function __construct() {
        $this->define_constants();
        $this->includes();
        $this->init_hooks();

        do_action('mirrorly_loaded');
    }

    /**
     * Define Mirrorly Constants
     */
    private function define_constants() {
        $this->define('MIRRORLY_ABSPATH', dirname(MIRRORLY_PLUGIN_FILE) . '/');
        $this->define('MIRRORLY_API_URL', 'https://api.mirrorly.com/v1/');
    }

    /**
     * Define constant if not already set
     */
    private function define($name, $value) {
        if (!defined($name)) {
            define($name, $value);
        }
    }

    /**
     * Include required core files
     */
    public function includes() {
        // Core classes
        include_once MIRRORLY_ABSPATH . 'includes/class-api-client.php';
        include_once MIRRORLY_ABSPATH . 'includes/class-license.php';

        if (is_admin()) {
            include_once MIRRORLY_ABSPATH . 'includes/class-admin.php';
            include_once MIRRORLY_ABSPATH . 'includes/class-product-meta.php';
        }

        if (!is_admin() || defined('DOING_AJAX')) {
            include_once MIRRORLY_ABSPATH . 'includes/class-frontend.php';
        }
    }

    /**
     * Hook into actions and filters
     */
    private function init_hooks() {
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));

        add_action('init', array($this, 'init'), 0);
        add_action('plugins_loaded', array($this, 'load_plugin_textdomain'));
    }

    /**
     * Init Mirrorly when WordPress Initialises
     */
    public function init() {
        // Before init action
        do_action('before_mirrorly_init');

        // Initialize API client
        $this->api_client = new Mirrorly_API_Client();

        // Initialize license manager
        $this->license = new Mirrorly_License();

        // Initialize admin
        if (is_admin()) {
            $this->admin = new Mirrorly_Admin();
        }

        // Initialize frontend
        if (!is_admin() || defined('DOING_AJAX')) {
            $this->frontend = new Mirrorly_Frontend();
        }

        // Init action
        do_action('mirrorly_init');
    }

    /**
     * Load Localisation files
     */
    public function load_plugin_textdomain() {
        $locale = determine_locale();
        $locale = apply_filters('plugin_locale', $locale, 'mirrorly');

        unload_textdomain('mirrorly');
        load_textdomain('mirrorly', WP_LANG_DIR . '/mirrorly/mirrorly-' . $locale . '.mo');
        load_plugin_textdomain('mirrorly', false, plugin_basename(dirname(MIRRORLY_PLUGIN_FILE)) . '/languages');
    }

    /**
     * Plugin activation
     */
    public function activate() {
        // Create database tables if needed
        $this->create_tables();

        // Set default options
        $this->set_default_options();

        // Flush rewrite rules
        flush_rewrite_rules();

        do_action('mirrorly_activated');
    }

    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clear any cached data
        wp_cache_flush();

        // Flush rewrite rules
        flush_rewrite_rules();

        do_action('mirrorly_deactivated');
    }

    /**
     * Create plugin tables
     */
    private function create_tables() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        // Table for storing generation history
        $table_name = $wpdb->prefix . 'mirrorly_generations';

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) DEFAULT NULL,
            product_id bigint(20) NOT NULL,
            user_image_hash varchar(64) NOT NULL,
            product_image_hash varchar(64) NOT NULL,
            result_image_url varchar(500) DEFAULT NULL,
            status varchar(20) DEFAULT 'pending',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            completed_at datetime DEFAULT NULL,
            api_request_id varchar(100) DEFAULT NULL,
            PRIMARY KEY (id),
            KEY product_id (product_id),
            KEY user_id (user_id),
            KEY status (status)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    /**
     * Set default plugin options
     */
    private function set_default_options() {
        $default_options = array(
            'api_key' => '',
            'license_key' => '',
            'license_type' => 'free',
            'custom_message' => __('¡Ve cómo te queda este producto!', 'mirrorly'),
            'widget_colors' => array(
                'primary' => '#007cba',
                'secondary' => '#ffffff',
                'text' => '#333333'
            ),
            'enabled_products' => array(),
            'max_products' => 3,
            'show_widget_position' => 'after_summary',
            'enable_analytics' => true
        );

        if (!get_option('mirrorly_options')) {
            add_option('mirrorly_options', $default_options);
        }
    }

    /**
     * Get the plugin url
     */
    public function plugin_url() {
        return untrailingslashit(plugins_url('/', MIRRORLY_PLUGIN_FILE));
    }

    /**
     * Get the plugin path
     */
    public function plugin_path() {
        return untrailingslashit(plugin_dir_path(MIRRORLY_PLUGIN_FILE));
    }

    /**
     * Get Ajax URL
     */
    public function ajax_url() {
        return admin_url('admin-ajax.php', 'relative');
    }
}

/**
 * Main instance of Mirrorly
 */
function Mirrorly() {
    return Mirrorly::instance();
}

// Global for backwards compatibility
$GLOBALS['mirrorly'] = Mirrorly();