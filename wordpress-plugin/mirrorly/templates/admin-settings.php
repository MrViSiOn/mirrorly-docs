<?php
/**
 * Admin Settings Template
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>

<div class="wrap">
	<h1><?php esc_html_e( 'Configuración de Mirrorly', 'mirrorly' ); ?></h1>

	<div class="mirrorly-admin-header">
		<div class="mirrorly-license-status">
			<?php if ( $license_status['is_pro'] ) : ?>
				<div class="mirrorly-status-badge pro">
					<span class="dashicons dashicons-yes-alt"></span>
					<?php esc_html_e( 'Licencia PRO Activa', 'mirrorly' ); ?>
				</div>
			<?php else : ?>
				<div class="mirrorly-status-badge free">
					<span class="dashicons dashicons-info"></span>
					<?php esc_html_e( 'Versión FREE', 'mirrorly' ); ?>
				</div>
			<?php endif; ?>

			<div class="mirrorly-usage-summary">
				<p>
					<strong><?php esc_html_e( 'Generaciones restantes:', 'mirrorly' ); ?></strong>
					<?php
					if ( $license_status['remaining_generations'] === 'unlimited' ) {
						esc_html_e( 'Ilimitadas', 'mirrorly' );
					} else {
						echo esc_html( $license_status['remaining_generations'] );
					}
					?>
				</p>
				<?php if ( ! $license_status['is_pro'] ) : ?>
					<p class="mirrorly-upgrade-prompt">
						<a href="#license_key" class="button button-primary">
							<?php esc_html_e( 'Actualizar a PRO', 'mirrorly' ); ?>
						</a>
					</p>
				<?php endif; ?>
			</div>
		</div>
	</div>

	<?php settings_errors(); ?>

	<form method="post" action="options.php">
		<?php settings_fields( 'mirrorly_settings' ); ?>

		<div class="mirrorly-settings-grid">
			<div class="mirrorly-settings-main">
				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row">
								<label for="license_key"><?php esc_html_e( 'Clave de Licencia PRO', 'mirrorly' ); ?></label>
							</th>
							<td>
								<?php
								$options     = get_option( 'mirrorly_options', array() );
								$license_key = isset( $options['license_key'] ) ? $options['license_key'] : '';
								?>
								<input type="text" id="license_key" name="mirrorly_options[license_key]"
										value="<?php echo esc_attr( $license_key ); ?>" class="regular-text"
										placeholder="<?php esc_attr_e( 'Ingresa tu clave de licencia PRO', 'mirrorly' ); ?>" />
								<button type="button" id="validate-license" class="button">
									<?php esc_html_e( 'Validar', 'mirrorly' ); ?>
								</button>
								<p class="description">
									<?php esc_html_e( 'Ingresa tu clave de licencia PRO para desbloquear todas las funciones. Déjalo vacío para usar la versión FREE.', 'mirrorly' ); ?>
									<br>
									<a href="https://mirrorly.com/pricing" target="_blank">
										<?php esc_html_e( '¿No tienes una licencia PRO? Consigue una aquí', 'mirrorly' ); ?>
									</a>
								</p>
								<div id="license-validation-result"></div>
							</td>
						</tr>

						<tr>
							<th scope="row">
								<label for="api_key"><?php esc_html_e( 'API Key', 'mirrorly' ); ?></label>
							</th>
							<td>
								<?php
								$api_key = isset( $options['api_key'] ) ? $options['api_key'] : '';
								?>
								<input type="text" id="api_key" name="mirrorly_options[api_key]"
										value="<?php echo esc_attr( $api_key ); ?>" class="regular-text" readonly />
								<button type="button" id="test-connection" class="button">
									<?php esc_html_e( 'Probar Conexión', 'mirrorly' ); ?>
								</button>
								<p class="description">
									<?php esc_html_e( 'Tu API key se genera automáticamente al registrar una licencia.', 'mirrorly' ); ?>
									<br>
									<a href="https://docs.mirrorly.com/setup" target="_blank">
										<?php esc_html_e( 'Ver tutorial de configuración completo', 'mirrorly' ); ?>
									</a>
								</p>
								<div id="connection-test-result"></div>
							</td>
						</tr>

						<tr>
							<th scope="row">
								<label for="custom_message"><?php esc_html_e( 'Mensaje Personalizado', 'mirrorly' ); ?></label>
							</th>
							<td>
								<?php
								$custom_message = isset( $options['custom_message'] ) ? $options['custom_message'] : __( '¡Ve cómo te queda este producto!', 'mirrorly' );
								?>
								<textarea id="custom_message" name="mirrorly_options[custom_message]"
											rows="3" class="large-text"><?php echo esc_textarea( $custom_message ); ?></textarea>
								<p class="description">
									<?php esc_html_e( 'Mensaje que aparece en el widget de productos. Puedes personalizarlo por producto individual.', 'mirrorly' ); ?>
								</p>
							</td>
						</tr>

						<tr>
							<th scope="row">
								<label for="widget_position"><?php esc_html_e( 'Posición del Widget', 'mirrorly' ); ?></label>
							</th>
							<td>
								<?php
								$position  = isset( $options['show_widget_position'] ) ? $options['show_widget_position'] : 'after_summary';
								$positions = array(
									'before_summary'    => __( 'Antes del resumen del producto', 'mirrorly' ),
									'after_summary'     => __( 'Después del resumen del producto', 'mirrorly' ),
									'after_add_to_cart' => __( 'Después del botón "Añadir al carrito"', 'mirrorly' ),
									'in_tabs'           => __( 'En una pestaña separada', 'mirrorly' ),
								);
								?>
								<select id="widget_position" name="mirrorly_options[show_widget_position]">
									<?php foreach ( $positions as $value => $label ) : ?>
										<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $position, $value ); ?>>
											<?php echo esc_html( $label ); ?>
										</option>
									<?php endforeach; ?>
								</select>
								<p class="description">
									<?php esc_html_e( 'Dónde mostrar el widget de Mirrorly en las páginas de producto.', 'mirrorly' ); ?>
								</p>
							</td>
						</tr>

						<?php if ( $license_status['is_pro'] ) : ?>
							<tr>
								<th scope="row">
									<label><?php _e( 'Colores del Widget', 'mirrorly' ); ?></label>
								</th>
								<td>
									<?php
									$colors       = isset( $options['widget_colors'] ) ? $options['widget_colors'] : array(
										'primary'   => '#007cba',
										'secondary' => '#ffffff',
										'text'      => '#333333',
									);
									$color_fields = array(
										'primary'   => __( 'Color Primario', 'mirrorly' ),
										'secondary' => __( 'Color Secundario', 'mirrorly' ),
										'text'      => __( 'Color del Texto', 'mirrorly' ),
									);
									?>
									<div class="mirrorly-color-fields">
										<?php foreach ( $color_fields as $key => $label ) : ?>
											<p>
												<label for="color_<?php echo $key; ?>"><?php echo $label; ?></label><br>
												<input type="text" id="color_<?php echo $key; ?>"
														name="mirrorly_options[widget_colors][<?php echo $key; ?>]"
														value="<?php echo esc_attr( isset( $colors[ $key ] ) ? $colors[ $key ] : '#007cba' ); ?>"
														class="mirrorly-color-picker" />
											</p>
										<?php endforeach; ?>
									</div>
									<p class="description">
										<?php _e( 'Personaliza los colores del widget para que coincidan con tu tema.', 'mirrorly' ); ?>
									</p>
								</td>
							</tr>

							<tr>
								<th scope="row">
									<label><?php _e( 'Productos Habilitados', 'mirrorly' ); ?></label>
								</th>
								<td>
									<?php
									$enabled_products = isset( $options['enabled_products'] ) ? $options['enabled_products'] : array();
									?>
									<div id="mirrorly-product-selector">
										<p>
											<button type="button" id="select-products" class="button">
												<?php _e( 'Seleccionar Productos', 'mirrorly' ); ?>
											</button>
										</p>
										<div id="selected-products-list">
											<?php if ( ! empty( $enabled_products ) ) : ?>
												<?php foreach ( $enabled_products as $product_id ) : ?>
													<?php $product = wc_get_product( $product_id ); ?>
													<?php if ( $product ) : ?>
														<div class="selected-product" data-product-id="<?php echo $product_id; ?>">
															<span><?php echo $product->get_name(); ?></span>
															<button type="button" class="remove-product">×</button>
															<input type="hidden" name="mirrorly_options[enabled_products][]" value="<?php echo $product_id; ?>" />
														</div>
													<?php endif; ?>
												<?php endforeach; ?>
											<?php endif; ?>
										</div>
									</div>
									<p class="description">
										<?php _e( 'Selecciona qué productos específicos tendrán la funcionalidad de Mirrorly. Déjalo vacío para habilitar en todos los productos.', 'mirrorly' ); ?>
									</p>
								</td>
							</tr>
						<?php endif; ?>
					</tbody>
				</table>
			</div>

			<div class="mirrorly-settings-sidebar">
				<div class="mirrorly-info-box">
					<h3><?php _e( 'Estado de la Licencia', 'mirrorly' ); ?></h3>
					<div class="mirrorly-license-details">
						<p>
							<strong><?php _e( 'Tipo:', 'mirrorly' ); ?></strong>
							<?php echo $license_status['is_pro'] ? __( 'PRO', 'mirrorly' ) : __( 'FREE', 'mirrorly' ); ?>
						</p>
						<p>
							<strong><?php _e( 'Límites:', 'mirrorly' ); ?></strong>
						</p>
						<ul>
							<li>
								<?php _e( 'Generaciones mensuales:', 'mirrorly' ); ?>
								<?php
								$monthly_limit = $license_status['limits']['monthly_generations'];
								echo $monthly_limit === -1 ? __( 'Ilimitadas', 'mirrorly' ) : $monthly_limit;
								?>
							</li>
							<li>
								<?php _e( 'Productos máximos:', 'mirrorly' ); ?>
								<?php
								$max_products = $license_status['limits']['max_products'];
								echo $max_products === -1 ? __( 'Ilimitados', 'mirrorly' ) : $max_products;
								?>
							</li>
							<li>
								<?php _e( 'Personalización:', 'mirrorly' ); ?>
								<?php echo $license_status['limits']['custom_styling'] ? __( 'Sí', 'mirrorly' ) : __( 'No', 'mirrorly' ); ?>
							</li>
						</ul>
					</div>
				</div>

				<div class="mirrorly-info-box">
					<h3><?php _e( 'Recursos Útiles', 'mirrorly' ); ?></h3>
					<ul class="mirrorly-resources">
						<li><a href="https://docs.mirrorly.com/setup" target="_blank"><?php _e( 'Guía de Configuración', 'mirrorly' ); ?></a></li>
						<li><a href="https://docs.mirrorly.com/troubleshooting" target="_blank"><?php _e( 'Solución de Problemas', 'mirrorly' ); ?></a></li>
						<li><a href="https://mirrorly.com/support" target="_blank"><?php _e( 'Soporte Técnico', 'mirrorly' ); ?></a></li>
						<li><a href="https://mirrorly.com/pricing" target="_blank"><?php _e( 'Planes y Precios', 'mirrorly' ); ?></a></li>
					</ul>
				</div>

				<?php if ( ! $license_status['is_pro'] ) : ?>
					<div class="mirrorly-info-box mirrorly-upgrade-box">
						<h3><?php _e( 'Actualizar a PRO', 'mirrorly' ); ?></h3>
						<p><?php _e( 'Desbloquea todas las funciones:', 'mirrorly' ); ?></p>
						<ul>
							<li>✓ <?php _e( 'Generaciones ilimitadas', 'mirrorly' ); ?></li>
							<li>✓ <?php _e( 'Productos ilimitados', 'mirrorly' ); ?></li>
							<li>✓ <?php _e( 'Personalización de colores', 'mirrorly' ); ?></li>
							<li>✓ <?php _e( 'Selección específica de productos', 'mirrorly' ); ?></li>
							<li>✓ <?php _e( 'Soporte prioritario', 'mirrorly' ); ?></li>
						</ul>
						<p>
							<a href="https://mirrorly.com/pricing" target="_blank" class="button button-primary">
								<?php _e( 'Ver Planes PRO', 'mirrorly' ); ?>
							</a>
						</p>
					</div>
				<?php endif; ?>
			</div>
		</div>

		<?php submit_button(); ?>
	</form>
</div>

<style>
.mirrorly-admin-header {
	background: #fff;
	border: 1px solid #ccd0d4;
	border-radius: 4px;
	padding: 20px;
	margin: 20px 0;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.mirrorly-status-badge {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 16px;
	border-radius: 20px;
	font-weight: 600;
	font-size: 14px;
}

.mirrorly-status-badge.pro {
	background: #d4edda;
	color: #155724;
	border: 1px solid #c3e6cb;
}

.mirrorly-status-badge.free {
	background: #fff3cd;
	color: #856404;
	border: 1px solid #ffeaa7;
}

.mirrorly-usage-summary p {
	margin: 5px 0;
}

.mirrorly-settings-grid {
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 20px;
	margin-top: 20px;
}

.mirrorly-settings-main {
	background: #fff;
	border: 1px solid #ccd0d4;
	border-radius: 4px;
	padding: 20px;
}

.mirrorly-settings-sidebar {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.mirrorly-info-box {
	background: #fff;
	border: 1px solid #ccd0d4;
	border-radius: 4px;
	padding: 20px;
}

.mirrorly-info-box h3 {
	margin-top: 0;
	margin-bottom: 15px;
	font-size: 16px;
}

.mirrorly-license-details ul,
.mirrorly-resources {
	margin: 10px 0;
	padding-left: 20px;
}

.mirrorly-upgrade-box {
	border-color: #007cba;
	background: #f0f8ff;
}

.mirrorly-upgrade-box ul {
	list-style: none;
	padding-left: 0;
}

.mirrorly-upgrade-box li {
	margin: 8px 0;
	color: #155724;
}

.mirrorly-color-fields p {
	display: inline-block;
	margin-right: 20px;
	vertical-align: top;
}

.mirrorly-color-picker {
	width: 80px !important;
}

#selected-products-list {
	margin-top: 10px;
}

.selected-product {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	background: #f0f0f1;
	border: 1px solid #c3c4c7;
	border-radius: 4px;
	padding: 6px 12px;
	margin: 4px;
	font-size: 13px;
}

.selected-product .remove-product {
	background: none;
	border: none;
	color: #dc3232;
	cursor: pointer;
	font-size: 16px;
	line-height: 1;
	padding: 0;
	width: 16px;
	height: 16px;
}

#license-validation-result,
#connection-test-result {
	margin-top: 10px;
	padding: 8px 12px;
	border-radius: 4px;
	display: none;
}

#license-validation-result.success,
#connection-test-result.success {
	background: #d4edda;
	color: #155724;
	border: 1px solid #c3e6cb;
}

#license-validation-result.error,
#connection-test-result.error {
	background: #f8d7da;
	color: #721c24;
	border: 1px solid #f5c6cb;
}

@media (max-width: 1200px) {
	.mirrorly-settings-grid {
		grid-template-columns: 1fr;
	}
}
</style>
