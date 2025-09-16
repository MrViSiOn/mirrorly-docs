<?php
/**
 * Frontend Widget Template
 *
 * This template displays the Mirrorly widget on product pages
 *
 * @package Mirrorly
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$custom_message = get_post_meta( $product->get_id(), '_mirrorly_custom_message', true );
if ( empty( $custom_message ) ) {
	$custom_message = isset( $options['custom_message'] ) ? $options['custom_message'] : __( '¡Ve cómo te queda este producto!', 'mirrorly' );
}

$widget_colors = isset( $options['widget_colors'] ) ? $options['widget_colors'] : array(
	'primary'   => '#007cba',
	'secondary' => '#ffffff',
	'text'      => '#333333',
);

$widget_styling = isset( $options['widget_styling'] ) ? $options['widget_styling'] : array(
	'border_radius' => '8',
	'button_style'  => 'rounded',
	'animation'     => 'fade',
	'shadow'        => 'medium',
	'font_size'     => 'medium',
);

// Build CSS classes for PRO styling.
$widget_classes = array( 'mirrorly-widget' );
if ( $license->is_pro() ) {
	$widget_classes[] = 'shadow-' . $widget_styling['shadow'];
	$widget_classes[] = 'font-size-' . $widget_styling['font_size'];
	$widget_classes[] = 'button-style-' . $widget_styling['button_style'];
	if ( 'none' !== $widget_styling['animation'] ) {
		$widget_classes[] = 'animation-' . $widget_styling['animation'];
	}
}
?>

<div id="mirrorly-widget" class="<?php echo esc_attr( implode( ' ', $widget_classes ) ); ?>" data-product-id="<?php echo esc_attr( $product->get_id() ); ?>">
	<div class="mirrorly-header">
		<h3 class="mirrorly-title"><?php echo esc_html( $custom_message ); ?></h3>

		<?php if ( ! $license_status['can_generate'] ) : ?>
			<div class="mirrorly-limit-notice">
				<?php if ( 0 === $license_status['remaining_generations'] ) : ?>
					<p class="mirrorly-error">
						<?php esc_html_e( 'Has alcanzado el límite de generaciones para este mes.', 'mirrorly' ); ?>
						<?php if ( $license->is_free() ) : ?>
							<a href="<?php echo esc_url( admin_url( 'admin.php?page=mirrorly-settings' ) ); ?>" class="mirrorly-upgrade-link">
								<?php esc_html_e( 'Actualizar a PRO', 'mirrorly' ); ?>
							</a>
						<?php endif; ?>
					</p>
				<?php endif; ?>
			</div>
		<?php else : ?>
			<div class="mirrorly-usage-info">
				<?php if ( 'unlimited' !== $license_status['remaining_generations'] ) : ?>
					<p class="mirrorly-remaining">
						<?php
						/* translators: %s: Number of remaining generations */
						printf( esc_html__( 'Generaciones restantes: %s', 'mirrorly' ), '<strong>' . esc_html( $license_status['remaining_generations'] ) . '</strong>' );
						?>
					</p>
				<?php endif; ?>
			</div>
		<?php endif; ?>
	</div>

	<?php if ( $license_status['can_generate'] ) : ?>
		<div class="mirrorly-upload-section">
			<div class="mirrorly-upload-area" id="mirrorly-upload-area">
				<div class="mirrorly-upload-content">
					<div class="mirrorly-upload-icon">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M14.2 11L12 8.8L9.8 11M12 8.8V15.2M7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V7.2C20 6.0799 20 5.51984 19.782 5.09202C19.5903 4.71569 19.2843 4.40973 18.908 4.21799C18.4802 4 17.9201 4 16.8 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.0799 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.0799 20 7.2 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
					<p class="mirrorly-upload-text">
						<?php esc_html_e( 'Arrastra tu foto aquí o haz clic para seleccionar', 'mirrorly' ); ?>
					</p>
					<p class="mirrorly-upload-hint">
						<?php
						$max_size = $license->is_pro() ? '5MB' : '2MB';
						/* translators: %s: Maximum file size */
						printf( esc_html__( 'JPG, PNG o GIF (máx. %s)', 'mirrorly' ), esc_html( $max_size ) );
						?>
					</p>
				</div>
				<input type="file" id="mirrorly-file-input" accept="image/*" style="display: none;">
			</div>

			<div class="mirrorly-preview-section" id="mirrorly-preview-section" style="display: none;">
				<div class="mirrorly-preview-container">
					<img id="mirrorly-user-preview" src="" alt="<?php esc_attr_e( 'Vista previa', 'mirrorly' ); ?>">
					<div class="mirrorly-preview-actions">
						<button type="button" id="mirrorly-change-image" class="mirrorly-btn mirrorly-btn-secondary">
							<?php esc_html_e( 'Cambiar imagen', 'mirrorly' ); ?>
						</button>
						<button type="button" id="mirrorly-generate-btn" class="mirrorly-btn mirrorly-btn-primary">
							<?php esc_html_e( 'Generar imagen', 'mirrorly' ); ?>
						</button>
					</div>
				</div>
			</div>
		</div>

		<div class="mirrorly-generation-section" id="mirrorly-generation-section" style="display: none;">
			<div class="mirrorly-loading" id="mirrorly-loading">
				<div class="mirrorly-spinner"></div>
				<p class="mirrorly-loading-text"><?php esc_html_e( 'Generando tu imagen personalizada...', 'mirrorly' ); ?></p>
				<p class="mirrorly-loading-hint"><?php esc_html_e( 'Esto puede tomar unos segundos', 'mirrorly' ); ?></p>
				<div class="mirrorly-progress">
					<div class="mirrorly-progress-bar"></div>
				</div>
			</div>

			<div class="mirrorly-result" id="mirrorly-result" style="display: none;">
				<div class="mirrorly-result-container">
					<img id="mirrorly-result-image" src="" alt="<?php esc_attr_e( 'Resultado generado', 'mirrorly' ); ?>">
					<div class="mirrorly-result-actions">
						<button type="button" id="mirrorly-download-btn" class="mirrorly-btn mirrorly-btn-primary">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<?php esc_html_e( 'Descargar', 'mirrorly' ); ?>
						</button>
						<button type="button" id="mirrorly-share-btn" class="mirrorly-btn mirrorly-btn-secondary">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.18875 15.0129 5.37498 15.0378 5.55671L8.56739 9.26894C8.01725 8.49196 7.08471 8 6.03553 8C4.37868 8 3.03553 9.34315 3.03553 11C3.03553 12.6569 4.37868 14 6.03553 14C7.08471 14 8.01725 13.508 8.56739 12.7311L15.0378 16.4433C15.0129 16.625 15 16.8112 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C16.9508 14 16.0183 14.492 15.4681 15.2689L8.99776 11.5567C9.02266 11.375 9.03553 11.1888 9.03553 11C9.03553 10.8112 9.02266 10.625 8.99776 10.4433L15.4681 6.73106C16.0183 7.50804 16.9508 8 18 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<?php esc_html_e( 'Compartir', 'mirrorly' ); ?>
						</button>
						<button type="button" id="mirrorly-try-again-btn" class="mirrorly-btn mirrorly-btn-outline">
							<?php esc_html_e( 'Probar otra vez', 'mirrorly' ); ?>
						</button>
					</div>
				</div>
			</div>

			<div class="mirrorly-error" id="mirrorly-error" style="display: none;">
				<div class="mirrorly-error-content">
					<div class="mirrorly-error-icon">⚠️</div>
					<p class="mirrorly-error-message" id="mirrorly-error-message"></p>
					<button type="button" id="mirrorly-retry-btn" class="mirrorly-btn mirrorly-btn-primary">
						<?php esc_html_e( 'Intentar de nuevo', 'mirrorly' ); ?>
					</button>
				</div>
			</div>
		</div>
	<?php endif; ?>

	<?php if ( $license->is_free() ) : ?>
		<div class="mirrorly-footer">
			<p class="mirrorly-upgrade-notice">
				<?php esc_html_e( '¿Quieres más generaciones y funciones avanzadas?', 'mirrorly' ); ?>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=mirrorly-settings' ) ); ?>" class="mirrorly-upgrade-link">
					<?php esc_html_e( 'Actualizar a PRO', 'mirrorly' ); ?>
				</a>
			</p>
		</div>
	<?php endif; ?>
</div>

<style>
	#mirrorly-widget {
		--mirrorly-primary: <?php echo esc_attr( $widget_colors['primary'] ); ?>;
		--mirrorly-secondary: <?php echo esc_attr( $widget_colors['secondary'] ); ?>;
		--mirrorly-text: <?php echo esc_attr( $widget_colors['text'] ); ?>;
		<?php if ( $license->is_pro() ) : ?>
		--mirrorly-radius: <?php echo esc_attr( $widget_styling['border_radius'] ); ?>px;
		<?php endif; ?>
	}

	.mirrorly-widget {
		background: #fff;
		border: 1px solid #e1e1e1;
		border-radius: 8px;
		padding: 20px;
		margin: 20px 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.mirrorly-header {
		text-align: center;
		margin-bottom: 20px;
	}

	.mirrorly-title {
		color: var(--mirrorly-text);
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 10px 0;
	}

	.mirrorly-usage-info {
		font-size: 14px;
		color: #666;
	}

	.mirrorly-remaining strong {
		color: var(--mirrorly-primary);
	}

	.mirrorly-upload-area {
		border: 2px dashed #ddd;
		border-radius: 8px;
		padding: 40px 20px;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
		background: #fafafa;
	}

	.mirrorly-upload-area:hover {
		border-color: var(--mirrorly-primary);
		background: #f0f8ff;
	}

	.mirrorly-upload-area.dragover {
		border-color: var(--mirrorly-primary);
		background: #e6f3ff;
	}

	.mirrorly-upload-icon {
		color: #999;
		margin-bottom: 15px;
	}

	.mirrorly-upload-text {
		font-size: 16px;
		color: var(--mirrorly-text);
		margin: 0 0 5px 0;
		font-weight: 500;
	}

	.mirrorly-upload-hint {
		font-size: 14px;
		color: #666;
		margin: 0;
	}

	.mirrorly-preview-container {
		text-align: center;
	}

	.mirrorly-preview-container img {
		max-width: 200px;
		max-height: 200px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		margin-bottom: 15px;
	}

	.mirrorly-preview-actions {
		display: flex;
		gap: 10px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.mirrorly-btn {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.3s ease;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
	}

	.mirrorly-btn-primary {
		background: var(--mirrorly-primary);
		color: white;
	}

	.mirrorly-btn-primary:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.mirrorly-btn-secondary {
		background: #f5f5f5;
		color: var(--mirrorly-text);
		border: 1px solid #ddd;
	}

	.mirrorly-btn-secondary:hover {
		background: #e9e9e9;
	}

	.mirrorly-btn-outline {
		background: transparent;
		color: var(--mirrorly-primary);
		border: 1px solid var(--mirrorly-primary);
	}

	.mirrorly-btn-outline:hover {
		background: var(--mirrorly-primary);
		color: white;
	}

	.mirrorly-loading {
		text-align: center;
		padding: 40px 20px;
	}

	.mirrorly-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid var(--mirrorly-primary);
		border-radius: 50%;
		animation: mirrorly-spin 1s linear infinite;
		margin: 0 auto 20px;
	}

	@keyframes mirrorly-spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.mirrorly-loading-text {
		font-size: 16px;
		font-weight: 500;
		color: var(--mirrorly-text);
		margin: 0 0 5px 0;
	}

	.mirrorly-loading-hint {
		font-size: 14px;
		color: #666;
		margin: 0;
	}

	.mirrorly-result-container {
		text-align: center;
	}

	.mirrorly-result-container img {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		margin-bottom: 20px;
	}

	.mirrorly-result-actions {
		display: flex;
		gap: 10px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.mirrorly-error-content {
		text-align: center;
		padding: 20px;
	}

	.mirrorly-error-icon {
		font-size: 48px;
		margin-bottom: 15px;
	}

	.mirrorly-error-message {
		color: #dc3232;
		font-size: 16px;
		margin: 0 0 20px 0;
	}

	.mirrorly-limit-notice {
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 6px;
		padding: 15px;
		margin-bottom: 20px;
	}

	.mirrorly-error {
		color: #dc3232;
		margin: 0;
	}

	.mirrorly-upgrade-link {
		color: var(--mirrorly-primary);
		text-decoration: none;
		font-weight: 500;
	}

	.mirrorly-upgrade-link:hover {
		text-decoration: underline;
	}

	.mirrorly-footer {
		text-align: center;
		margin-top: 20px;
		padding-top: 15px;
		border-top: 1px solid #eee;
	}

	.mirrorly-upgrade-notice {
		font-size: 14px;
		color: #666;
		margin: 0;
	}

	@media (max-width: 768px) {
		.mirrorly-widget {
			padding: 15px;
		}

		.mirrorly-preview-actions,
		.mirrorly-result-actions {
			flex-direction: column;
			align-items: center;
		}

		.mirrorly-btn {
			width: 100%;
			max-width: 200px;
			justify-content: center;
		}
	}
</style>
