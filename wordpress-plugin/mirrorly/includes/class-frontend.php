<?php
/**
 * Mirrorly Frontend
 *
 * Handles frontend functionality and widget display
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Mirrorly_Frontend {

	/**
	 * Constructor
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'init' ) );
	}

	/**
	 * Initialize frontend
	 */
	public function init() {
		// Only load on WooCommerce product pages
		if ( is_product() || wp_doing_ajax() ) {
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
			add_action( 'woocommerce_single_product_summary', array( $this, 'display_widget' ), $this->get_widget_priority() );

			// AJAX handlers
			add_action( 'wp_ajax_mirrorly_generate_image', array( $this, 'ajax_generate_image' ) );
			add_action( 'wp_ajax_nopriv_mirrorly_generate_image', array( $this, 'ajax_generate_image' ) );
			add_action( 'wp_ajax_mirrorly_check_generation_status', array( $this, 'ajax_check_generation_status' ) );
			add_action( 'wp_ajax_nopriv_mirrorly_check_generation_status', array( $this, 'ajax_check_generation_status' ) );
		}
	}

	/**
	 * Enqueue frontend scripts and styles
	 */
	public function enqueue_scripts() {
		if ( ! $this->should_show_widget() ) {
			return;
		}

		wp_enqueue_style(
			'mirrorly-frontend',
			MIRRORLY_PLUGIN_URL . 'assets/css/frontend.css',
			array(),
			MIRRORLY_VERSION
		);

		wp_enqueue_script(
			'mirrorly-frontend',
			MIRRORLY_PLUGIN_URL . 'assets/js/frontend.js',
			array( 'jquery' ),
			MIRRORLY_VERSION,
			true
		);

		// Localize script with data
		$license        = new Mirrorly_License();
		$license_status = $license->get_license_status();
		$options        = get_option( 'mirrorly_options', array() );

		// Get widget styling for PRO users
		$widget_styling   = isset( $options['widget_styling'] ) ? $options['widget_styling'] : array();
		$widget_animation = isset( $widget_styling['animation'] ) ? $widget_styling['animation'] : 'fade';

		wp_localize_script(
			'mirrorly-frontend',
			'mirrorly_frontend',
			array(
				'ajax_url'              => admin_url( 'admin-ajax.php' ),
				'nonce'                 => wp_create_nonce( 'mirrorly_frontend_nonce' ),
				'product_id'            => get_the_ID(),
				'license_type'          => $license_status['type'],
				'can_generate'          => $license_status['can_generate'],
				'remaining_generations' => $license_status['remaining_generations'],
				'widget_animation'      => $widget_animation,
				'generation_style'      => isset( $options['generation_style'] ) ? $options['generation_style'] : 'realistic',
				'preload_images'        => array(), // Could be populated with common icons
				'strings'               => array(
					'upload_image'        => __( 'Sube tu foto', 'mirrorly' ),
					'generating'          => __( 'Generando imagen...', 'mirrorly' ),
					'generation_complete' => __( '¡Imagen generada!', 'mirrorly' ),
					'generation_failed'   => __( 'Error al generar imagen', 'mirrorly' ),
					'invalid_file'        => __( 'Por favor selecciona una imagen válida', 'mirrorly' ),
					'file_too_large'      => __( 'La imagen es demasiado grande', 'mirrorly' ),
					'rate_limit_exceeded' => __( 'Has alcanzado el límite de generaciones. Intenta de nuevo más tarde.', 'mirrorly' ),
					'upgrade_to_pro'      => __( 'Actualiza a PRO para más generaciones', 'mirrorly' ),
					'download_image'      => __( 'Descargar imagen', 'mirrorly' ),
					'share_image'         => __( 'Compartir imagen', 'mirrorly' ),
					'processing_image'    => __( 'Procesando tu imagen...', 'mirrorly' ),
					'status_check_error'  => __( 'Error al verificar el estado de la generación', 'mirrorly' ),
					'network_error'       => __( 'Error de conexión. Por favor, verifica tu conexión a internet.', 'mirrorly' ),
					'server_error'        => __( 'Error del servidor. Por favor, inténtalo de nuevo más tarde.', 'mirrorly' ),
					'timeout_error'       => __( 'La generación está tomando más tiempo del esperado. Por favor, inténtalo de nuevo.', 'mirrorly' ),
				),
			)
		);
	}

	/**
	 * Display the Mirrorly widget
	 */
	public function display_widget() {
		if ( ! $this->should_show_widget() ) {
			return;
		}

		global $product;

		$options        = get_option( 'mirrorly_options', array() );
		$license        = new Mirrorly_License();
		$license_status = $license->get_license_status();

		// Get product image for Mirrorly
		$mirrorly_image_id = get_post_meta( $product->get_id(), '_mirrorly_image_id', true );
		if ( empty( $mirrorly_image_id ) ) {
			$mirrorly_image_id = $product->get_image_id();
		}

		$product_image_url = wp_get_attachment_image_url( $mirrorly_image_id, 'full' );

		if ( empty( $product_image_url ) ) {
			return; // No image available
		}

		include MIRRORLY_PLUGIN_DIR . 'templates/frontend-widget.php';
	}

	/**
	 * Check if widget should be shown for current product
	 */
	private function should_show_widget() {
		global $product;

		if ( ! $product || ! is_a( $product, 'WC_Product' ) ) {
			return false;
		}

		// Check if Mirrorly is enabled for this product
		$mirrorly_enabled = get_post_meta( $product->get_id(), '_mirrorly_enabled', true );
		if ( $mirrorly_enabled === 'no' ) {
			return false;
		}

		// For FREE version, check product limits
		$license = new Mirrorly_License();
		if ( $license->is_free() ) {
			$enabled_products = $this->get_enabled_products_for_free();
			if ( ! empty( $enabled_products ) && ! in_array( $product->get_id(), $enabled_products ) ) {
				return false;
			}
		}

		// For PRO version, check specific product selection
		if ( $license->is_pro() ) {
			$options          = get_option( 'mirrorly_options', array() );
			$enabled_products = isset( $options['enabled_products'] ) ? $options['enabled_products'] : array();

			// If specific products are selected, only show for those
			if ( ! empty( $enabled_products ) && ! in_array( $product->get_id(), $enabled_products ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Get enabled products for FREE version (limited to max_products)
	 */
	private function get_enabled_products_for_free() {
		$options      = get_option( 'mirrorly_options', array() );
		$max_products = isset( $options['max_products'] ) ? $options['max_products'] : 3;

		// Get products that have Mirrorly explicitly enabled
		$args = array(
			'post_type'      => 'product',
			'posts_per_page' => $max_products,
			'meta_query'     => array(
				array(
					'key'     => '_mirrorly_enabled',
					'value'   => 'yes',
					'compare' => '=',
				),
			),
			'fields'         => 'ids',
		);

		$enabled_products = get_posts( $args );

		// If no products explicitly enabled, get first N products
		if ( empty( $enabled_products ) ) {
			$args             = array(
				'post_type'      => 'product',
				'posts_per_page' => $max_products,
				'fields'         => 'ids',
			);
			$enabled_products = get_posts( $args );
		}

		return $enabled_products;
	}

	/**
	 * Get widget display priority based on position setting
	 */
	private function get_widget_priority() {
		$options  = get_option( 'mirrorly_options', array() );
		$position = isset( $options['show_widget_position'] ) ? $options['show_widget_position'] : 'after_summary';

		$priorities = array(
			'before_summary'    => 15,
			'after_summary'     => 25,
			'after_add_to_cart' => 35,
			'in_tabs'           => 50,
		);

		return isset( $priorities[ $position ] ) ? $priorities[ $position ] : 25;
	}

	/**
	 * AJAX: Generate image
	 */
	public function ajax_generate_image() {
		check_ajax_referer( 'mirrorly_frontend_nonce', 'nonce' );

		// Validate required data
		if ( empty( $_POST['product_id'] ) || empty( $_FILES['user_image'] ) ) {
			wp_send_json_error( __( 'Datos incompletos', 'mirrorly' ) );
		}

		$product_id = intval( $_POST['product_id'] );
		$product    = wc_get_product( $product_id );

		if ( ! $product ) {
			wp_send_json_error( __( 'Producto no encontrado', 'mirrorly' ) );
		}

		// Check if widget should be shown for this product
		if ( ! $this->should_show_widget() ) {
			wp_send_json_error( __( 'Mirrorly no está habilitado para este producto', 'mirrorly' ) );
		}

		// Validate user image
		$user_image        = $_FILES['user_image'];
		$validation_result = $this->validate_uploaded_image( $user_image );

		if ( is_wp_error( $validation_result ) ) {
			wp_send_json_error( $validation_result->get_error_message() );
		}

		// Check license and limits
		$license = new Mirrorly_License();
		if ( ! $license->can_generate() ) {
			wp_send_json_error( __( 'Has alcanzado el límite de generaciones para este mes', 'mirrorly' ) );
		}

		// Get product image
		$mirrorly_image_id = get_post_meta( $product_id, '_mirrorly_image_id', true );
		if ( empty( $mirrorly_image_id ) ) {
			$mirrorly_image_id = $product->get_image_id();
		}

		$product_image_path = get_attached_file( $mirrorly_image_id );
		if ( ! $product_image_path || ! file_exists( $product_image_path ) ) {
			wp_send_json_error( __( 'Imagen del producto no encontrada', 'mirrorly' ) );
		}

		// Process user image
		$user_image_path = $this->process_uploaded_image( $user_image );
		if ( is_wp_error( $user_image_path ) ) {
			wp_send_json_error( $user_image_path->get_error_message() );
		}

		// Generate image via API
		$api_client         = new Mirrorly_API_Client();
		$generation_options = array(
			'style'   => isset( $_POST['style'] ) ? sanitize_text_field( $_POST['style'] ) : 'realistic',
			'quality' => 'high',
		);

		$result = $api_client->generate_image( $user_image_path, $product_image_path, $product_id, $generation_options );

		// Clean up temporary user image
		if ( file_exists( $user_image_path ) ) {
			unlink( $user_image_path );
		}

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( $result->get_error_message() );
		}

		// Return success with image URL
		wp_send_json_success(
			array(
				'image_url'             => $result['imageUrl'],
				'processing_time'       => isset( $result['processingTime'] ) ? $result['processingTime'] : null,
				'remaining_generations' => $license->get_remaining_generations(),
			)
		);
	}

	/**
	 * AJAX: Check generation status (for async generations)
	 */
	public function ajax_check_generation_status() {
		check_ajax_referer( 'mirrorly_frontend_nonce', 'nonce' );

		if ( empty( $_POST['generation_id'] ) ) {
			wp_send_json_error( __( 'ID de generación no proporcionado', 'mirrorly' ) );
		}

		$generation_id = sanitize_text_field( $_POST['generation_id'] );

		$api_client = new Mirrorly_API_Client();
		$status     = $api_client->get_generation_status( $generation_id );

		if ( is_wp_error( $status ) ) {
			wp_send_json_error( $status->get_error_message() );
		}

		// If completed, get the result
		if ( isset( $status['status'] ) && $status['status'] === 'completed' ) {
			$result = $api_client->get_generation_result( $generation_id );

			if ( ! is_wp_error( $result ) ) {
				$license = new Mirrorly_License();
				wp_send_json_success(
					array(
						'status'                => 'completed',
						'image_url'             => $result['imageUrl'],
						'processing_time'       => isset( $result['processingTime'] ) ? $result['processingTime'] : null,
						'remaining_generations' => $license->get_remaining_generations(),
					)
				);
			}
		}

		// Return current status
		wp_send_json_success( $status );
	}

	/**
	 * Validate uploaded image
	 */
	private function validate_uploaded_image( $file ) {
		// Check for upload errors
		if ( $file['error'] !== UPLOAD_ERR_OK ) {
			return new WP_Error( 'upload_error', __( 'Error al subir la imagen', 'mirrorly' ) );
		}

		// Check file size (max 5MB for PRO, 2MB for FREE)
		$license  = new Mirrorly_License();
		$max_size = $license->is_pro() ? 5 * 1024 * 1024 : 2 * 1024 * 1024;

		if ( $file['size'] > $max_size ) {
			$max_size_mb = $max_size / ( 1024 * 1024 );
			return new WP_Error( 'file_too_large', sprintf( __( 'La imagen es demasiado grande. Máximo permitido: %dMB', 'mirrorly' ), $max_size_mb ) );
		}

		// Check file type
		$allowed_types = array( 'image/jpeg', 'image/jpg', 'image/png', 'image/gif' );
		$file_type     = wp_check_filetype( $file['name'] );

		if ( ! in_array( $file['type'], $allowed_types ) || ! in_array( $file_type['type'], $allowed_types ) ) {
			return new WP_Error( 'invalid_file_type', __( 'Tipo de archivo no válido. Solo se permiten JPG, PNG y GIF', 'mirrorly' ) );
		}

		// Check if it's actually an image
		$image_info = getimagesize( $file['tmp_name'] );
		if ( $image_info === false ) {
			return new WP_Error( 'invalid_image', __( 'El archivo no es una imagen válida', 'mirrorly' ) );
		}

		return true;
	}

	/**
	 * Process uploaded image (resize, optimize)
	 */
	private function process_uploaded_image( $file ) {
		$upload_dir = wp_upload_dir();
		$temp_dir   = $upload_dir['basedir'] . '/mirrorly-temp/';

		// Create temp directory if it doesn't exist
		if ( ! file_exists( $temp_dir ) ) {
			wp_mkdir_p( $temp_dir );
		}

		// Generate unique filename
		$filename  = 'user_' . uniqid() . '_' . sanitize_file_name( $file['name'] );
		$temp_file = $temp_dir . $filename;

		// Move uploaded file to temp location
		if ( ! move_uploaded_file( $file['tmp_name'], $temp_file ) ) {
			return new WP_Error( 'move_failed', __( 'Error al procesar la imagen', 'mirrorly' ) );
		}

		// Resize image if too large (max 1024x1024 for API efficiency)
		$image_editor = wp_get_image_editor( $temp_file );
		if ( ! is_wp_error( $image_editor ) ) {
			$image_size = $image_editor->get_size();

			if ( $image_size['width'] > 1024 || $image_size['height'] > 1024 ) {
				$image_editor->resize( 1024, 1024, false );
				$image_editor->save( $temp_file );
			}
		}

		return $temp_file;
	}

	/**
	 * Clean up old temporary files
	 */
	public static function cleanup_temp_files() {
		$upload_dir = wp_upload_dir();
		$temp_dir   = $upload_dir['basedir'] . '/mirrorly-temp/';

		if ( ! file_exists( $temp_dir ) ) {
			return;
		}

		$files = glob( $temp_dir . '*' );
		$now   = time();

		foreach ( $files as $file ) {
			if ( is_file( $file ) && ( $now - filemtime( $file ) ) > 3600 ) { // Delete files older than 1 hour
				unlink( $file );
			}
		}
	}
}
