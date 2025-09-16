<?php
/**
 * Mirrorly Admin
 *
 * Handles admin functionality and settings
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Mirrorly_Admin {

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'admin_init', array( $this, 'admin_init' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_scripts' ) );
		add_action( 'admin_notices', array( $this, 'admin_notices' ) );

		// AJAX handlers
		add_action( 'wp_ajax_mirrorly_validate_license', array( $this, 'ajax_validate_license' ) );
		add_action( 'wp_ajax_mirrorly_test_api_connection', array( $this, 'ajax_test_api_connection' ) );
		add_action( 'wp_ajax_mirrorly_load_products', array( $this, 'ajax_load_products' ) );
		add_action( 'wp_ajax_mirrorly_search_products', array( $this, 'ajax_search_products' ) );
		add_action( 'wp_ajax_mirrorly_preview_widget', array( $this, 'ajax_preview_widget' ) );
		add_action( 'wp_ajax_mirrorly_save_product_message', array( $this, 'ajax_save_product_message' ) );
		add_action( 'wp_ajax_mirrorly_get_image_url', array( $this, 'ajax_get_image_url' ) );
	}

	/**
	 * Add admin menu
	 */
	public function admin_menu() {
		add_menu_page(
			__( 'Mirrorly', 'mirrorly' ),
			__( 'Mirrorly', 'mirrorly' ),
			'manage_options',
			'mirrorly-settings',
			array( $this, 'settings_page' ),
			'dashicons-camera-alt',
			56
		);

		add_submenu_page(
			'mirrorly-settings',
			__( 'Configuración', 'mirrorly' ),
			__( 'Configuración', 'mirrorly' ),
			'manage_options',
			'mirrorly-settings',
			array( $this, 'settings_page' )
		);

		add_submenu_page(
			'mirrorly-settings',
			__( 'Estadísticas', 'mirrorly' ),
			__( 'Estadísticas', 'mirrorly' ),
			'manage_options',
			'mirrorly-stats',
			array( $this, 'stats_page' )
		);

		add_submenu_page(
			'mirrorly-settings',
			__( 'Ayuda', 'mirrorly' ),
			__( 'Ayuda', 'mirrorly' ),
			'manage_options',
			'mirrorly-help',
			array( $this, 'help_page' )
		);
	}

	/**
	 * Initialize admin settings
	 */
	public function admin_init() {
		register_setting( 'mirrorly_settings', 'mirrorly_options', array( $this, 'validate_options' ) );

		// General Settings Section
		add_settings_section(
			'mirrorly_general',
			__( 'Configuración General', 'mirrorly' ),
			array( $this, 'general_section_callback' ),
			'mirrorly_settings'
		);

		add_settings_field(
			'license_key',
			__( 'Clave de Licencia', 'mirrorly' ),
			array( $this, 'license_key_callback' ),
			'mirrorly_settings',
			'mirrorly_general'
		);

		add_settings_field(
			'api_key',
			__( 'API Key', 'mirrorly' ),
			array( $this, 'api_key_callback' ),
			'mirrorly_settings',
			'mirrorly_general'
		);

		// Display Settings Section
		add_settings_section(
			'mirrorly_display',
			__( 'Configuración de Visualización', 'mirrorly' ),
			array( $this, 'display_section_callback' ),
			'mirrorly_settings'
		);

		add_settings_field(
			'custom_message',
			__( 'Mensaje Personalizado', 'mirrorly' ),
			array( $this, 'custom_message_callback' ),
			'mirrorly_settings',
			'mirrorly_display'
		);

		add_settings_field(
			'widget_position',
			__( 'Posición del Widget', 'mirrorly' ),
			array( $this, 'widget_position_callback' ),
			'mirrorly_settings',
			'mirrorly_display'
		);

		// PRO Settings Section (only for PRO users)
		$license = new Mirrorly_License();
		if ( $license->is_pro() ) {
			add_settings_section(
				'mirrorly_pro',
				__( 'Configuración PRO', 'mirrorly' ),
				array( $this, 'pro_section_callback' ),
				'mirrorly_settings'
			);

			add_settings_field(
				'widget_colors',
				__( 'Colores del Widget', 'mirrorly' ),
				array( $this, 'widget_colors_callback' ),
				'mirrorly_settings',
				'mirrorly_pro'
			);

			add_settings_field(
				'widget_styling',
				__( 'Estilos Avanzados', 'mirrorly' ),
				array( $this, 'widget_styling_callback' ),
				'mirrorly_settings',
				'mirrorly_pro'
			);

			add_settings_field(
				'enabled_products',
				__( 'Productos Habilitados', 'mirrorly' ),
				array( $this, 'enabled_products_callback' ),
				'mirrorly_settings',
				'mirrorly_pro'
			);

			add_settings_field(
				'product_messages',
				__( 'Mensajes por Producto', 'mirrorly' ),
				array( $this, 'product_messages_callback' ),
				'mirrorly_settings',
				'mirrorly_pro'
			);
		}
	}

	/**
	 * Enqueue admin scripts and styles
	 */
	public function admin_scripts( $hook ) {
		if ( strpos( $hook, 'mirrorly' ) === false ) {
			return;
		}

		wp_enqueue_style(
			'mirrorly-admin',
			MIRRORLY_PLUGIN_URL . 'assets/css/admin.css',
			array(),
			MIRRORLY_VERSION
		);

		wp_enqueue_script(
			'mirrorly-admin',
			MIRRORLY_PLUGIN_URL . 'assets/js/admin.js',
			array( 'jquery', 'wp-color-picker' ),
			MIRRORLY_VERSION,
			true
		);

		wp_localize_script(
			'mirrorly-admin',
			'mirrorly_admin',
			array(
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'mirrorly_admin_nonce' ),
				'strings'  => array(
					'validating'         => __( 'Validando...', 'mirrorly' ),
					'testing_connection' => __( 'Probando conexión...', 'mirrorly' ),
					'connection_success' => __( 'Conexión exitosa', 'mirrorly' ),
					'connection_failed'  => __( 'Error de conexión', 'mirrorly' ),
					'license_valid'      => __( 'Licencia válida', 'mirrorly' ),
					'license_invalid'    => __( 'Licencia inválida', 'mirrorly' ),
					'preview_updating'   => __( 'Actualizando vista previa...', 'mirrorly' ),
					'message_saved'      => __( 'Mensaje guardado', 'mirrorly' ),
					'message_save_error' => __( 'Error al guardar mensaje', 'mirrorly' ),
				),
			)
		);

		wp_enqueue_style( 'wp-color-picker' );
	}

	/**
	 * Show admin notices
	 */
	public function admin_notices() {
		$options = get_option( 'mirrorly_options', array() );

		// Show setup notice if no API key
		if ( empty( $options['api_key'] ) && current_user_can( 'manage_options' ) ) {
			echo '<div class="notice notice-warning is-dismissible">';
			echo '<p><strong>' . __( 'Mirrorly:', 'mirrorly' ) . '</strong> ' . __( 'Para comenzar a usar Mirrorly, necesitas configurar tu API key.', 'mirrorly' ) . ' ';
			echo '<a href="' . admin_url( 'admin.php?page=mirrorly-settings' ) . '">' . __( 'Configurar ahora', 'mirrorly' ) . '</a></p>';
			echo '</div>';
		}
	}

	/**
	 * Settings page
	 */
	public function settings_page() {
		$license        = new Mirrorly_License();
		$license_status = $license->get_license_status();

		include MIRRORLY_PLUGIN_DIR . 'templates/admin-settings.php';
	}

	/**
	 * Stats page
	 */
	public function stats_page() {
		$api_client  = new Mirrorly_API_Client();
		$usage_stats = $api_client->get_usage_stats();
		$license     = new Mirrorly_License();

		include MIRRORLY_PLUGIN_DIR . 'templates/admin-stats.php';
	}

	/**
	 * Help page
	 */
	public function help_page() {
		include MIRRORLY_PLUGIN_DIR . 'templates/admin-help.php';
	}

	/**
	 * Validate options
	 */
	public function validate_options( $input ) {
		$output = get_option( 'mirrorly_options', array() );

		// Validate license key
		if ( isset( $input['license_key'] ) ) {
			$license_key = sanitize_text_field( $input['license_key'] );

			if ( ! empty( $license_key ) && $license_key !== $output['license_key'] ) {
				// New license key, validate it
				$license = new Mirrorly_License();
				$result  = $license->register_pro_license( $license_key );

				if ( is_wp_error( $result ) ) {
					add_settings_error( 'mirrorly_options', 'license_key', $result->get_error_message() );
				} else {
					$output['license_key'] = $license_key;
					add_settings_error( 'mirrorly_options', 'license_key', __( 'Licencia PRO activada correctamente', 'mirrorly' ), 'success' );
				}
			} elseif ( empty( $license_key ) ) {
				$output['license_key'] = '';
			}
		}

		// Validate API key
		if ( isset( $input['api_key'] ) ) {
			$output['api_key'] = sanitize_text_field( $input['api_key'] );
		}

		// Validate custom message
		if ( isset( $input['custom_message'] ) ) {
			$output['custom_message'] = sanitize_textarea_field( $input['custom_message'] );
		}

		// Validate widget position
		if ( isset( $input['show_widget_position'] ) ) {
			$valid_positions = array( 'before_summary', 'after_summary', 'after_add_to_cart', 'in_tabs' );
			if ( in_array( $input['show_widget_position'], $valid_positions ) ) {
				$output['show_widget_position'] = $input['show_widget_position'];
			}
		}

		// Validate PRO settings
		$license = new Mirrorly_License();
		if ( $license->is_pro() ) {
			// Validate widget colors
			if ( isset( $input['widget_colors'] ) && is_array( $input['widget_colors'] ) ) {
				foreach ( $input['widget_colors'] as $key => $color ) {
					if ( preg_match( '/^#[a-f0-9]{6}$/i', $color ) ) {
						$output['widget_colors'][ $key ] = $color;
					}
				}
			}

			// Validate widget styling
			if ( isset( $input['widget_styling'] ) && is_array( $input['widget_styling'] ) ) {
				$valid_styling = array();

				// Border radius (0-20)
				if ( isset( $input['widget_styling']['border_radius'] ) ) {
					$border_radius                  = intval( $input['widget_styling']['border_radius'] );
					$valid_styling['border_radius'] = max( 0, min( 20, $border_radius ) );
				}

				// Button style
				$valid_button_styles = array( 'rounded', 'square', 'pill' );
				if ( isset( $input['widget_styling']['button_style'] ) && in_array( $input['widget_styling']['button_style'], $valid_button_styles ) ) {
					$valid_styling['button_style'] = $input['widget_styling']['button_style'];
				}

				// Animation
				$valid_animations = array( 'none', 'fade', 'slide', 'bounce' );
				if ( isset( $input['widget_styling']['animation'] ) && in_array( $input['widget_styling']['animation'], $valid_animations ) ) {
					$valid_styling['animation'] = $input['widget_styling']['animation'];
				}

				// Shadow
				$valid_shadows = array( 'none', 'light', 'medium', 'heavy' );
				if ( isset( $input['widget_styling']['shadow'] ) && in_array( $input['widget_styling']['shadow'], $valid_shadows ) ) {
					$valid_styling['shadow'] = $input['widget_styling']['shadow'];
				}

				// Font size
				$valid_font_sizes = array( 'small', 'medium', 'large' );
				if ( isset( $input['widget_styling']['font_size'] ) && in_array( $input['widget_styling']['font_size'], $valid_font_sizes ) ) {
					$valid_styling['font_size'] = $input['widget_styling']['font_size'];
				}

				$output['widget_styling'] = $valid_styling;
			}

			// Validate enabled products
			if ( isset( $input['enabled_products'] ) && is_array( $input['enabled_products'] ) ) {
				$output['enabled_products'] = array_map( 'intval', $input['enabled_products'] );
			}
		}

		return $output;
	}

	/**
	 * General section callback
	 */
	public function general_section_callback() {
		echo '<p>' . __( 'Configuración básica del plugin Mirrorly.', 'mirrorly' ) . '</p>';
	}

	/**
	 * Display section callback
	 */
	public function display_section_callback() {
		echo '<p>' . __( 'Personaliza cómo se muestra el widget de Mirrorly en tu tienda.', 'mirrorly' ) . '</p>';
	}

	/**
	 * PRO section callback
	 */
	public function pro_section_callback() {
		echo '<p>' . __( 'Configuración avanzada disponible solo para usuarios PRO.', 'mirrorly' ) . '</p>';
	}

	/**
	 * License key field callback
	 */
	public function license_key_callback() {
		$options     = get_option( 'mirrorly_options', array() );
		$license_key = isset( $options['license_key'] ) ? $options['license_key'] : '';
		$license     = new Mirrorly_License();

		echo '<input type="text" id="license_key" name="mirrorly_options[license_key]" value="' . esc_attr( $license_key ) . '" class="regular-text" />';
		echo '<button type="button" id="validate-license" class="button">' . __( 'Validar', 'mirrorly' ) . '</button>';
		echo '<p class="description">' . __( 'Ingresa tu clave de licencia PRO. Déjalo vacío para usar la versión FREE.', 'mirrorly' ) . '</p>';

		if ( $license->is_pro() ) {
			echo '<p class="mirrorly-license-status pro"><span class="dashicons dashicons-yes-alt"></span> ' . __( 'Licencia PRO activa', 'mirrorly' ) . '</p>';
		} else {
			echo '<p class="mirrorly-license-status free"><span class="dashicons dashicons-info"></span> ' . __( 'Usando versión FREE', 'mirrorly' ) . '</p>';
		}
	}

	/**
	 * API key field callback
	 */
	public function api_key_callback() {
		$options = get_option( 'mirrorly_options', array() );
		$api_key = isset( $options['api_key'] ) ? $options['api_key'] : '';

		echo '<input type="text" id="api_key" name="mirrorly_options[api_key]" value="' . esc_attr( $api_key ) . '" class="regular-text" />';
		echo '<button type="button" id="test-connection" class="button">' . __( 'Probar Conexión', 'mirrorly' ) . '</button>';
		echo '<p class="description">' . __( 'Tu API key se genera automáticamente al registrar una licencia.', 'mirrorly' ) . ' ';
		echo '<a href="https://docs.mirrorly.com/setup" target="_blank">' . __( 'Ver tutorial de configuración', 'mirrorly' ) . '</a></p>';
	}

	/**
	 * Custom message field callback
	 */
	public function custom_message_callback() {
		$options = get_option( 'mirrorly_options', array() );
		$message = isset( $options['custom_message'] ) ? $options['custom_message'] : __( '¡Ve cómo te queda este producto!', 'mirrorly' );

		echo '<textarea id="custom_message" name="mirrorly_options[custom_message]" rows="3" class="large-text">' . esc_textarea( $message ) . '</textarea>';
		echo '<p class="description">' . __( 'Mensaje que aparece en el widget de productos.', 'mirrorly' ) . '</p>';
	}

	/**
	 * Widget position field callback
	 */
	public function widget_position_callback() {
		$options  = get_option( 'mirrorly_options', array() );
		$position = isset( $options['show_widget_position'] ) ? $options['show_widget_position'] : 'after_summary';

		$positions = array(
			'before_summary'    => __( 'Antes del resumen del producto', 'mirrorly' ),
			'after_summary'     => __( 'Después del resumen del producto', 'mirrorly' ),
			'after_add_to_cart' => __( 'Después del botón "Añadir al carrito"', 'mirrorly' ),
			'in_tabs'           => __( 'En una pestaña separada', 'mirrorly' ),
		);

		echo '<select id="widget_position" name="mirrorly_options[show_widget_position]">';
		foreach ( $positions as $value => $label ) {
			echo '<option value="' . esc_attr( $value ) . '"' . selected( $position, $value, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
		echo '<p class="description">' . __( 'Dónde mostrar el widget de Mirrorly en las páginas de producto.', 'mirrorly' ) . '</p>';
	}

	/**
	 * Widget colors field callback
	 */
	public function widget_colors_callback() {
		$options = get_option( 'mirrorly_options', array() );
		$colors  = isset( $options['widget_colors'] ) ? $options['widget_colors'] : array(
			'primary'   => '#007cba',
			'secondary' => '#ffffff',
			'text'      => '#333333',
		);

		$color_fields = array(
			'primary'   => __( 'Color Primario', 'mirrorly' ),
			'secondary' => __( 'Color Secundario', 'mirrorly' ),
			'text'      => __( 'Color del Texto', 'mirrorly' ),
		);

		echo '<div class="mirrorly-color-fields">';
		foreach ( $color_fields as $key => $label ) {
			$color = isset( $colors[ $key ] ) ? $colors[ $key ] : '#007cba';
			echo '<p>';
			echo '<label for="color_' . $key . '">' . $label . '</label><br>';
			echo '<input type="text" id="color_' . $key . '" name="mirrorly_options[widget_colors][' . $key . ']" value="' . esc_attr( $color ) . '" class="mirrorly-color-picker" />';
			echo '</p>';
		}
		echo '</div>';
		echo '<p class="description">' . __( 'Personaliza los colores del widget para que coincidan con tu tema.', 'mirrorly' ) . '</p>';
	}

	/**
	 * Widget styling field callback
	 */
	public function widget_styling_callback() {
		$options = get_option( 'mirrorly_options', array() );
		$styling = isset( $options['widget_styling'] ) ? $options['widget_styling'] : array(
			'border_radius' => '8',
			'button_style'  => 'rounded',
			'animation'     => 'fade',
			'shadow'        => 'medium',
			'font_size'     => 'medium',
		);

		echo '<div class="mirrorly-styling-fields">';

		// Border radius
		echo '<p>';
		echo '<label for="border_radius">' . __( 'Radio de Borde (px)', 'mirrorly' ) . '</label><br>';
		echo '<input type="range" id="border_radius" name="mirrorly_options[widget_styling][border_radius]" value="' . esc_attr( $styling['border_radius'] ) . '" min="0" max="20" step="1" />';
		echo '<span class="range-value">' . esc_attr( $styling['border_radius'] ) . 'px</span>';
		echo '</p>';

		// Button style
		echo '<p>';
		echo '<label for="button_style">' . __( 'Estilo de Botones', 'mirrorly' ) . '</label><br>';
		$button_styles = array(
			'rounded' => __( 'Redondeado', 'mirrorly' ),
			'square'  => __( 'Cuadrado', 'mirrorly' ),
			'pill'    => __( 'Píldora', 'mirrorly' ),
		);
		echo '<select id="button_style" name="mirrorly_options[widget_styling][button_style]">';
		foreach ( $button_styles as $value => $label ) {
			echo '<option value="' . esc_attr( $value ) . '"' . selected( $styling['button_style'], $value, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
		echo '</p>';

		// Animation
		echo '<p>';
		echo '<label for="animation">' . __( 'Animación', 'mirrorly' ) . '</label><br>';
		$animations = array(
			'none'   => __( 'Sin animación', 'mirrorly' ),
			'fade'   => __( 'Desvanecimiento', 'mirrorly' ),
			'slide'  => __( 'Deslizamiento', 'mirrorly' ),
			'bounce' => __( 'Rebote', 'mirrorly' ),
		);
		echo '<select id="animation" name="mirrorly_options[widget_styling][animation]">';
		foreach ( $animations as $value => $label ) {
			echo '<option value="' . esc_attr( $value ) . '"' . selected( $styling['animation'], $value, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
		echo '</p>';

		// Shadow
		echo '<p>';
		echo '<label for="shadow">' . __( 'Sombra', 'mirrorly' ) . '</label><br>';
		$shadows = array(
			'none'   => __( 'Sin sombra', 'mirrorly' ),
			'light'  => __( 'Ligera', 'mirrorly' ),
			'medium' => __( 'Media', 'mirrorly' ),
			'heavy'  => __( 'Intensa', 'mirrorly' ),
		);
		echo '<select id="shadow" name="mirrorly_options[widget_styling][shadow]">';
		foreach ( $shadows as $value => $label ) {
			echo '<option value="' . esc_attr( $value ) . '"' . selected( $styling['shadow'], $value, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
		echo '</p>';

		// Font size
		echo '<p>';
		echo '<label for="font_size">' . __( 'Tamaño de Fuente', 'mirrorly' ) . '</label><br>';
		$font_sizes = array(
			'small'  => __( 'Pequeño', 'mirrorly' ),
			'medium' => __( 'Medio', 'mirrorly' ),
			'large'  => __( 'Grande', 'mirrorly' ),
		);
		echo '<select id="font_size" name="mirrorly_options[widget_styling][font_size]">';
		foreach ( $font_sizes as $value => $label ) {
			echo '<option value="' . esc_attr( $value ) . '"' . selected( $styling['font_size'], $value, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select>';
		echo '</p>';

		echo '</div>';

		// Live preview
		echo '<div class="mirrorly-style-preview">';
		echo '<h4>' . __( 'Vista Previa', 'mirrorly' ) . '</h4>';
		echo '<div id="mirrorly-widget-preview">';
		echo $this->generate_widget_preview();
		echo '</div>';
		echo '</div>';

		echo '<p class="description">' . __( 'Personaliza el aspecto visual del widget. Los cambios se reflejan en tiempo real en la vista previa.', 'mirrorly' ) . '</p>';
	}

	/**
	 * Enabled products field callback
	 */
	public function enabled_products_callback() {
		$options          = get_option( 'mirrorly_options', array() );
		$enabled_products = isset( $options['enabled_products'] ) ? $options['enabled_products'] : array();

		echo '<div id="mirrorly-product-selector">';
		echo '<p><button type="button" id="select-products" class="button">' . __( 'Seleccionar Productos', 'mirrorly' ) . '</button></p>';
		echo '<div id="selected-products-list">';

		if ( ! empty( $enabled_products ) ) {
			foreach ( $enabled_products as $product_id ) {
				$product = wc_get_product( $product_id );
				if ( $product ) {
					echo '<div class="selected-product" data-product-id="' . $product_id . '">';
					echo '<span>' . $product->get_name() . '</span>';
					echo '<button type="button" class="remove-product">×</button>';
					echo '<input type="hidden" name="mirrorly_options[enabled_products][]" value="' . $product_id . '" />';
					echo '</div>';
				}
			}
		}

		echo '</div>';
		echo '</div>';
		echo '<p class="description">' . __( 'Selecciona qué productos específicos tendrán la funcionalidad de Mirrorly. Déjalo vacío para habilitar en todos los productos.', 'mirrorly' ) . '</p>';
	}

	/**
	 * Product messages field callback
	 */
	public function product_messages_callback() {
		$options          = get_option( 'mirrorly_options', array() );
		$enabled_products = isset( $options['enabled_products'] ) ? $options['enabled_products'] : array();

		echo '<div id="mirrorly-product-messages">';

		if ( empty( $enabled_products ) ) {
			echo '<p class="description">' . __( 'Primero selecciona productos específicos para personalizar sus mensajes individuales.', 'mirrorly' ) . '</p>';
		} else {
			echo '<div class="mirrorly-messages-list">';
			foreach ( $enabled_products as $product_id ) {
				$product = wc_get_product( $product_id );
				if ( $product ) {
					$custom_message = get_post_meta( $product_id, '_mirrorly_custom_message', true );
					if ( empty( $custom_message ) ) {
						$custom_message = $options['custom_message'] ?? __( '¡Ve cómo te queda este producto!', 'mirrorly' );
					}

					echo '<div class="mirrorly-product-message" data-product-id="' . $product_id . '">';
					echo '<h4>' . esc_html( $product->get_name() ) . '</h4>';
					echo '<textarea class="product-message-input" data-product-id="' . $product_id . '" rows="2" cols="50">' . esc_textarea( $custom_message ) . '</textarea>';
					echo '<button type="button" class="button save-product-message" data-product-id="' . $product_id . '">' . __( 'Guardar', 'mirrorly' ) . '</button>';
					echo '<span class="save-status" style="display:none;"></span>';
					echo '</div>';
				}
			}
			echo '</div>';
		}

		echo '</div>';
		echo '<p class="description">' . __( 'Personaliza el mensaje que aparece en cada producto individual. Si no se especifica, se usará el mensaje global.', 'mirrorly' ) . '</p>';
	}

	/**
	 * AJAX: Validate license
	 */
	public function ajax_validate_license() {
		check_ajax_referer( 'mirrorly_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'No tienes permisos para realizar esta acción.', 'mirrorly' ) );
		}

		$license_key = sanitize_text_field( $_POST['license_key'] );

		if ( empty( $license_key ) ) {
			wp_send_json_error( __( 'La clave de licencia no puede estar vacía', 'mirrorly' ) );
		}

		$license = new Mirrorly_License();
		$result  = $license->register_pro_license( $license_key );

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( $result->get_error_message() );
		}

		wp_send_json_success( __( 'Licencia PRO activada correctamente', 'mirrorly' ) );
	}

	/**
	 * AJAX: Test API connection
	 */
	public function ajax_test_api_connection() {
		check_ajax_referer( 'mirrorly_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'No tienes permisos para realizar esta acción.', 'mirrorly' ) );
		}

		$api_client = new Mirrorly_API_Client();
		$result     = $api_client->check_limits();
		
		if ( is_wp_error( $result ) ) {
			wp_send_json_error( $result->get_error_message() );
		}

		wp_send_json_success( __( 'Conexión exitosa con la API', 'mirrorly' ) );
	}

	/**
	 * AJAX: Load products for selector
	 */
	public function ajax_load_products() {
		check_ajax_referer( 'mirrorly_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'No tienes permisos para realizar esta acción.', 'mirrorly' ) );
		}

		$products = $this->get_products_for_selector();
		wp_send_json_success( $products );
	}

	/**
	 * AJAX: Search products
	 */
	public function ajax_search_products() {
		check_ajax_referer( 'mirrorly_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'No tienes permisos para realizar esta acción.', 'mirrorly' ) );
		}

		$query    = sanitize_text_field( $_POST['query'] );
		$products = $this->get_products_for_selector( $query );
		wp_send_json_success( $products );
	}

	/**
	 * Get products for selector
	 */
	private function get_products_for_selector( $search = '' ) {
		$args = array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => 50,
			'meta_query'     => array(
				array(
					'key'     => '_stock_status',
					'value'   => 'instock',
					'compare' => '=',
				),
			),
		);

		if ( ! empty( $search ) ) {
			$args['s'] = $search;
		}

		$query    = new WP_Query( $args );
		$products = array();

		if ( $query->have_posts() ) {
			while ( $query->have_posts() ) {
				$query->the_post();
				$product = wc_get_product( get_the_ID() );

				if ( $product ) {
					$image_id  = $product->get_image_id();
					$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'thumbnail' ) : wc_placeholder_img_src( 'thumbnail' );

					$products[] = array(
						'id'    => get_the_ID(),
						'name'  => get_the_title(),
						'image' => $image_url,
						'price' => $product->get_price_html(),
					);
				}
			}
			wp_reset_postdata();
		}

		return $products;
	}

	/**
	 * AJAX: Preview widget with current settings
	 */
	public function ajax_preview_widget() {
		check_ajax_referer( 'mirrorly_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'No tienes permisos para realizar esta acción.', 'mirrorly' ) );
		}

		$colors  = isset( $_POST['colors'] ) ? $_POST['colors'] : array();
		$styling = isset( $_POST['styling'] ) ? $_POST['styling'] : array();

		$preview_html = $this->generate_widget_preview( $colors, $styling );
		wp_send_json_success( $preview_html );
	}

	/**
	 * AJAX: Save product message
	 */
	public function ajax_save_product_message() {
		check_ajax_referer( 'mirrorly_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'No tienes permisos para realizar esta acción.', 'mirrorly' ) );
		}

		$product_id = intval( $_POST['product_id'] );
		$message    = sanitize_textarea_field( $_POST['message'] );

		if ( $product_id && $message ) {
			update_post_meta( $product_id, '_mirrorly_custom_message', $message );
			wp_send_json_success( __( 'Mensaje guardado correctamente', 'mirrorly' ) );
		} else {
			wp_send_json_error( __( 'Datos inválidos', 'mirrorly' ) );
		}
	}

	/**
	 * AJAX: Get image URL
	 */
	public function ajax_get_image_url() {
		check_ajax_referer( 'mirrorly_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'No tienes permisos para realizar esta acción.', 'mirrorly' ) );
		}

		$image_id = intval( $_POST['image_id'] );
		$size     = sanitize_text_field( $_POST['size'] ) ?: 'thumbnail';

		if ( $image_id ) {
			$image_url = wp_get_attachment_image_url( $image_id, $size );
			if ( $image_url ) {
				wp_send_json_success( array( 'url' => $image_url ) );
			}
		}

		wp_send_json_error( __( 'Imagen no encontrada', 'mirrorly' ) );
	}

	/**
	 * Generate widget preview HTML
	 */
	private function generate_widget_preview( $colors = array(), $styling = array() ) {
		$options = get_option( 'mirrorly_options', array() );

		// Merge with current options
		$preview_colors = array_merge(
			isset( $options['widget_colors'] ) ? $options['widget_colors'] : array(),
			$colors
		);

		$preview_styling = array_merge(
			isset( $options['widget_styling'] ) ? $options['widget_styling'] : array(),
			$styling
		);

		// Default values
		$primary_color   = isset( $preview_colors['primary'] ) ? $preview_colors['primary'] : '#007cba';
		$secondary_color = isset( $preview_colors['secondary'] ) ? $preview_colors['secondary'] : '#ffffff';
		$text_color      = isset( $preview_colors['text'] ) ? $preview_colors['text'] : '#333333';

		$border_radius = isset( $preview_styling['border_radius'] ) ? $preview_styling['border_radius'] : '8';
		$button_style  = isset( $preview_styling['button_style'] ) ? $preview_styling['button_style'] : 'rounded';
		$shadow        = isset( $preview_styling['shadow'] ) ? $preview_styling['shadow'] : 'medium';
		$font_size     = isset( $preview_styling['font_size'] ) ? $preview_styling['font_size'] : 'medium';

		// Generate CSS classes
		$widget_classes = array(
			'mirrorly-widget-preview',
			'button-style-' . $button_style,
			'shadow-' . $shadow,
			'font-size-' . $font_size,
		);

		$custom_message = isset( $options['custom_message'] ) ? $options['custom_message'] : __( '¡Ve cómo te queda este producto!', 'mirrorly' );

		ob_start();
		?>
		<div class="<?php echo implode( ' ', $widget_classes ); ?>" style="
			--primary-color: <?php echo esc_attr( $primary_color ); ?>;
			--secondary-color: <?php echo esc_attr( $secondary_color ); ?>;
			--text-color: <?php echo esc_attr( $text_color ); ?>;
			--border-radius: <?php echo esc_attr( $border_radius ); ?>px;
		">
			<div class="mirrorly-widget-header">
				<h3><?php echo esc_html( $custom_message ); ?></h3>
			</div>
			<div class="mirrorly-widget-content">
				<div class="mirrorly-upload-area">
					<div class="mirrorly-upload-icon">📷</div>
					<p><?php _e( 'Sube tu foto aquí', 'mirrorly' ); ?></p>
					<button class="mirrorly-upload-btn"><?php _e( 'Seleccionar Imagen', 'mirrorly' ); ?></button>
				</div>
				<div class="mirrorly-actions">
					<button class="mirrorly-generate-btn" disabled><?php _e( 'Generar Vista Previa', 'mirrorly' ); ?></button>
				</div>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}
}
