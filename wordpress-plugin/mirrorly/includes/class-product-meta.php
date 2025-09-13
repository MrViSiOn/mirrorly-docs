<?php
/**
 * Mirrorly Product Meta
 *
 * Handles product-specific Mirrorly settings
 */

if (!defined('ABSPATH')) {
    exit;
}

class Mirrorly_Product_Meta {

    /**
     * Constructor
     */
    public function __construct() {
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_product_fields'));
        add_action('woocommerce_process_product_meta', array($this, 'save_product_fields'));
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
    }

    /**
     * Add Mirrorly fields to product general tab
     */
    public function add_product_fields() {
        global $post;

        echo '<div class="options_group mirrorly-product-options">';

        // Mirrorly enabled checkbox
        woocommerce_wp_checkbox(array(
            'id' => '_mirrorly_enabled',
            'label' => __('Habilitar Mirrorly', 'mirrorly'),
            'description' => __('Permite a los usuarios probar este producto virtualmente', 'mirrorly'),
            'desc_tip' => true
        ));

        // Image selector for Mirrorly
        $this->image_selector_field();

        // Custom message for this product
        woocommerce_wp_textarea_input(array(
            'id' => '_mirrorly_custom_message',
            'label' => __('Mensaje personalizado', 'mirrorly'),
            'placeholder' => __('Déjalo vacío para usar el mensaje global', 'mirrorly'),
            'description' => __('Mensaje específico para este producto (opcional)', 'mirrorly'),
            'desc_tip' => true
        ));

        echo '</div>';
    }

    /**
     * Add meta boxes for Mirrorly settings
     */
    public function add_meta_boxes() {
        add_meta_box(
            'mirrorly-product-settings',
            __('Configuración de Mirrorly', 'mirrorly'),
            array($this, 'meta_box_content'),
            'product',
            'side',
            'default'
        );
    }

    /**
     * Meta box content
     */
    public function meta_box_content($post) {
        $mirrorly_enabled = get_post_meta($post->ID, '_mirrorly_enabled', true);
        $mirrorly_image_id = get_post_meta($post->ID, '_mirrorly_image_id', true);
        $custom_message = get_post_meta($post->ID, '_mirrorly_custom_message', true);

        wp_nonce_field('mirrorly_product_meta_nonce', 'mirrorly_product_meta_nonce');

        echo '<div class="mirrorly-meta-box">';

        // Status indicator
        echo '<p><strong>' . __('Estado:', 'mirrorly') . '</strong> ';
        if ($mirrorly_enabled === 'yes') {
            echo '<span class="mirrorly-status enabled">' . __('Habilitado', 'mirrorly') . '</span>';
        } else {
            echo '<span class="mirrorly-status disabled">' . __('Deshabilitado', 'mirrorly') . '</span>';
        }
        echo '</p>';

        // Quick enable/disable
        echo '<p>';
        echo '<label>';
        echo '<input type="checkbox" name="_mirrorly_enabled" value="yes"' . checked($mirrorly_enabled, 'yes', false) . '> ';
        echo __('Habilitar Mirrorly para este producto', 'mirrorly');
        echo '</label>';
        echo '</p>';

        // Image preview
        if ($mirrorly_image_id) {
            $image_url = wp_get_attachment_image_url($mirrorly_image_id, 'thumbnail');
            if ($image_url) {
                echo '<p><strong>' . __('Imagen para Mirrorly:', 'mirrorly') . '</strong></p>';
                echo '<p><img src="' . esc_url($image_url) . '" style="max-width: 100px; height: auto;" /></p>';
            }
        }

        // License info
        $license = new Mirrorly_License();
        $license_status = $license->get_license_status();

        echo '<div class="mirrorly-license-info">';
        echo '<p><strong>' . __('Licencia:', 'mirrorly') . '</strong> ';

        if ($license->is_pro()) {
            echo '<span class="mirrorly-license pro">' . __('PRO', 'mirrorly') . '</span>';
        } else {
            echo '<span class="mirrorly-license free">' . __('FREE', 'mirrorly') . '</span>';
        }
        echo '</p>';

        if ($license->is_free()) {
            $enabled_count = $this->count_enabled_products();
            $max_products = $license_status['limits']['max_products'];

            echo '<p class="description">';
            echo sprintf(__('Productos habilitados: %d de %d', 'mirrorly'), $enabled_count, $max_products);
            echo '</p>';

            if ($enabled_count >= $max_products && $mirrorly_enabled !== 'yes') {
                echo '<p class="mirrorly-warning">';
                echo __('Has alcanzado el límite de productos para la versión FREE.', 'mirrorly');
                echo ' <a href="' . admin_url('admin.php?page=mirrorly-settings') . '">' . __('Actualizar a PRO', 'mirrorly') . '</a>';
                echo '</p>';
            }
        }

        echo '</div>';

        echo '</div>';

        // Add some CSS
        echo '<style>
        .mirrorly-meta-box .mirrorly-status.enabled { color: #46b450; font-weight: bold; }
        .mirrorly-meta-box .mirrorly-status.disabled { color: #dc3232; }
        .mirrorly-meta-box .mirrorly-license.pro { color: #46b450; font-weight: bold; }
        .mirrorly-meta-box .mirrorly-license.free { color: #ffb900; font-weight: bold; }
        .mirrorly-meta-box .mirrorly-warning { color: #dc3232; font-size: 12px; }
        </style>';
    }

    /**
     * Image selector field
     */
    private function image_selector_field() {
        global $post;

        $mirrorly_image_id = get_post_meta($post->ID, '_mirrorly_image_id', true);
        $product = wc_get_product($post->ID);

        echo '<p class="form-field _mirrorly_image_field">';
        echo '<label for="_mirrorly_image">' . __('Imagen para Mirrorly', 'mirrorly') . '</label>';

        // Get product gallery images
        $gallery_ids = $product ? $product->get_gallery_image_ids() : array();
        $main_image_id = $product ? $product->get_image_id() : 0;

        $available_images = array();
        if ($main_image_id) {
            $available_images[$main_image_id] = __('Imagen principal', 'mirrorly');
        }

        foreach ($gallery_ids as $image_id) {
            $available_images[$image_id] = __('Galería', 'mirrorly') . ' - ' . basename(get_attached_file($image_id));
        }

        if (!empty($available_images)) {
            echo '<select id="_mirrorly_image" name="_mirrorly_image_id" class="select short">';
            echo '<option value="">' . __('Usar imagen principal', 'mirrorly') . '</option>';

            foreach ($available_images as $image_id => $label) {
                echo '<option value="' . esc_attr($image_id) . '"' . selected($mirrorly_image_id, $image_id, false) . '>' . esc_html($label) . '</option>';
            }

            echo '</select>';

            // Preview
            if ($mirrorly_image_id) {
                $preview_url = wp_get_attachment_image_url($mirrorly_image_id, 'thumbnail');
                if ($preview_url) {
                    echo '<br><img id="mirrorly-image-preview" src="' . esc_url($preview_url) . '" style="max-width: 100px; height: auto; margin-top: 5px;" />';
                }
            }
        } else {
            echo '<span class="description">' . __('Agrega imágenes al producto para seleccionar cuál usar con Mirrorly', 'mirrorly') . '</span>';
        }

        echo '<span class="description" style="display: block; margin-top: 5px;">' . __('Selecciona qué imagen del producto usar para la generación con IA', 'mirrorly') . '</span>';
        echo '</p>';

        // Add JavaScript for image preview
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            $('#_mirrorly_image').change(function() {
                var imageId = $(this).val();
                var preview = $('#mirrorly-image-preview');

                if (imageId) {
                    // Get image URL via AJAX
                    $.post(ajaxurl, {
                        action: 'mirrorly_get_image_url',
                        image_id: imageId,
                        size: 'thumbnail',
                        nonce: '<?php echo wp_create_nonce('mirrorly_get_image_url'); ?>'
                    }, function(response) {
                        if (response.success && response.data.url) {
                            if (preview.length) {
                                preview.attr('src', response.data.url);
                            } else {
                                $('#_mirrorly_image').after('<br><img id="mirrorly-image-preview" src="' + response.data.url + '" style="max-width: 100px; height: auto; margin-top: 5px;" />');
                            }
                        }
                    });
                } else {
                    preview.remove();
                }
            });
        });
        </script>
        <?php
    }

    /**
     * Save product fields
     */
    public function save_product_fields($post_id) {
        if (!isset($_POST['mirrorly_product_meta_nonce']) || !wp_verify_nonce($_POST['mirrorly_product_meta_nonce'], 'mirrorly_product_meta_nonce')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        // Check FREE license limits
        $license = new Mirrorly_License();
        if ($license->is_free()) {
            $mirrorly_enabled = isset($_POST['_mirrorly_enabled']) ? 'yes' : 'no';
            $current_enabled = get_post_meta($post_id, '_mirrorly_enabled', true);

            // If trying to enable and it's not currently enabled
            if ($mirrorly_enabled === 'yes' && $current_enabled !== 'yes') {
                $enabled_count = $this->count_enabled_products();
                $max_products = $license->get_license_limits()['max_products'];

                if ($enabled_count >= $max_products) {
                    // Don't allow enabling more products
                    add_action('admin_notices', function() {
                        echo '<div class="notice notice-error"><p>' . __('No puedes habilitar más productos con la versión FREE. Actualiza a PRO para productos ilimitados.', 'mirrorly') . '</p></div>';
                    });
                    return;
                }
            }
        }

        // Save Mirrorly enabled
        $mirrorly_enabled = isset($_POST['_mirrorly_enabled']) ? 'yes' : 'no';
        update_post_meta($post_id, '_mirrorly_enabled', $mirrorly_enabled);

        // Save Mirrorly image
        if (isset($_POST['_mirrorly_image_id'])) {
            $image_id = intval($_POST['_mirrorly_image_id']);
            update_post_meta($post_id, '_mirrorly_image_id', $image_id);
        }

        // Save custom message
        if (isset($_POST['_mirrorly_custom_message'])) {
            $custom_message = sanitize_textarea_field($_POST['_mirrorly_custom_message']);
            update_post_meta($post_id, '_mirrorly_custom_message', $custom_message);
        }
    }

    /**
     * Count enabled products
     */
    private function count_enabled_products() {
        global $wpdb;

        $count = $wpdb->get_var("
            SELECT COUNT(*)
            FROM {$wpdb->postmeta} pm
            INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
            WHERE pm.meta_key = '_mirrorly_enabled'
            AND pm.meta_value = 'yes'
            AND p.post_type = 'product'
            AND p.post_status = 'publish'
        ");

        return intval($count);
    }

    /**
     * AJAX: Get image URL
     */
    public static function ajax_get_image_url() {
        check_ajax_referer('mirrorly_get_image_url', 'nonce');

        $image_id = intval($_POST['image_id']);
        $size = sanitize_text_field($_POST['size']);

        $image_url = wp_get_attachment_image_url($image_id, $size);

        if ($image_url) {
            wp_send_json_success(array('url' => $image_url));
        } else {
            wp_send_json_error(__('Imagen no encontrada', 'mirrorly'));
        }
    }
}

// Initialize if in admin
if (is_admin()) {
    new Mirrorly_Product_Meta();

    // Add AJAX handler
    add_action('wp_ajax_mirrorly_get_image_url', array('Mirrorly_Product_Meta', 'ajax_get_image_url'));
}