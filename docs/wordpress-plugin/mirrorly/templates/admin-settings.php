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

	<?php
	// Get plugin options once for the entire form
	$options = get_option( 'mirrorly_options', array() );
	$api_key = isset( $options['api_key'] ) ? $options['api_key'] : '';
	$has_key = ! empty( $api_key );

	// Show warning if Google API Key is not configured
	if ( ! $has_key ) :
	?>
	<div class="notice notice-warning">
		<p>
			<strong><?php esc_html_e( 'Atención: Debes configurar tu clave API de Google Generative AI para que Mirrorly funcione correctamente.', 'mirrorly' ); ?></strong>
			<a href="https://docs.mirrorly.com/setup" target="_blank">
				<?php esc_html_e( 'Ver guía de configuración', 'mirrorly' ); ?>
			</a>
		</p>
	</div>
	<?php endif; ?>

	<?php settings_errors(); ?>

	<form method="post" action="options.php">
		<?php settings_fields( 'mirrorly_settings' ); ?>

		<div class="mirrorly-settings-grid">
			<div class="mirrorly-settings-main">
				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row">
								<label for="api_key"><?php esc_html_e( 'Clave API de Google Generative AI', 'mirrorly' ); ?></label>
							</th>
							<td>
								<?php
								$masked_key = '';
								if ( ! empty( $api_key ) ) {
									$masked_key = str_repeat( '*', max( 0, strlen( $api_key ) - 4 ) ) . substr( $api_key, -4 );
								}
								?>
								<div class="mirrorly-api-key-container">
									<input type="password" id="api_key_display"
										   value="<?php echo esc_attr( $masked_key ); ?>"
										   class="regular-text" readonly
										   placeholder="<?php esc_attr_e( 'No configurado', 'mirrorly' ); ?>" />
									<input type="text" id="api_key_edit" name="mirrorly_options[api_key]"
										   value="<?php echo esc_attr( $api_key ); ?>"
										   class="regular-text" style="display: none;"
										   placeholder="<?php esc_attr_e( 'Ingresa tu clave API de Google Generative AI', 'mirrorly' ); ?>" />

									<div class="mirrorly-api-buttons">
										<?php if ( $has_key ) : ?>
											<button type="button" id="edit-api-key" class="button">
												<?php esc_html_e( 'Editar', 'mirrorly' ); ?>
											</button>
											<button type="button" id="save-api-key" class="button button-primary" style="display: none;">
												<?php esc_html_e( 'Guardar', 'mirrorly' ); ?>
											</button>
											<button type="button" id="cancel-edit-api-key" class="button" style="display: none;">
												<?php esc_html_e( 'Cancelar', 'mirrorly' ); ?>
											</button>
										<?php else : ?>
											<button type="button" id="add-api-key" class="button button-primary">
												<?php esc_html_e( 'Configurar', 'mirrorly' ); ?>
											</button>
											<button type="button" id="save-api-key" class="button button-primary" style="display: none;">
												<?php esc_html_e( 'Guardar', 'mirrorly' ); ?>
											</button>
											<button type="button" id="cancel-edit-api-key" class="button" style="display: none;">
												<?php esc_html_e( 'Cancelar', 'mirrorly' ); ?>
											</button>
										<?php endif; ?>

										<button type="button" id="test-connection" class="button" <?php echo $has_key ? '' : 'disabled'; ?>>
											<?php esc_html_e( 'Probar Conexión', 'mirrorly' ); ?>
										</button>
									</div>
								</div>

								<p class="description">
									<?php esc_html_e( 'Ingresa tu clave API de Google Generative AI para habilitar la generación de imágenes con IA. Esta clave es diferente a la licencia del plugin.', 'mirrorly' ); ?>
									<br>
									<a href="https://docs.mirrorly.com/setup" target="_blank">
										<?php esc_html_e( 'Ver tutorial de configuración completo', 'mirrorly' ); ?>
									</a>
								</p>
								<div id="connection-test-result"></div>
								<div id="api-key-save-result"></div>
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

/* API Key Container Styles */
.mirrorly-api-key-container {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.mirrorly-api-buttons {
	display: flex;
	gap: 8px;
	align-items: center;
	flex-wrap: wrap;
}

#api_key_display,
#api_key_edit {
	width: 100%;
	max-width: 400px;
}

#license-validation-result,
#connection-test-result,
#api-key-save-result {
	margin-top: 10px;
	padding: 8px 12px;
	border-radius: 4px;
	display: none;
}

#license-validation-result.success,
#connection-test-result.success,
#api-key-save-result.success {
	background: #d4edda;
	color: #155724;
	border: 1px solid #c3e6cb;
}

#license-validation-result.error,
#connection-test-result.error,
#api-key-save-result.error {
	background: #f8d7da;
	color: #721c24;
	border: 1px solid #f5c6cb;
}

#api-key-save-result.loading {
	background: #fff3cd;
	color: #856404;
	border: 1px solid #ffeaa7;
}

@media (max-width: 1200px) {
	.mirrorly-settings-grid {
		grid-template-columns: 1fr;
	}
}
</style>

<script>
jQuery(document).ready(function($) {
	var originalApiKey = $('#api_key_edit').val();

	// Función para mostrar/ocultar elementos
	function toggleEditMode(editing) {
		if (editing) {
			$('#api_key_display').hide();
			$('#api_key_edit').show().focus();
			$('#edit-api-key, #add-api-key').hide();
			$('#save-api-key, #cancel-edit-api-key').show();
		} else {
			$('#api_key_display').show();
			$('#api_key_edit').hide();
			$('#save-api-key, #cancel-edit-api-key').hide();
			if ($('#api_key_edit').val()) {
				$('#edit-api-key').show();
				$('#add-api-key').hide();
			} else {
				$('#edit-api-key').hide();
				$('#add-api-key').show();
			}
		}
	}

	// Función para actualizar la máscara
	function updateMaskedKey(key) {
		if (key && key.length > 4) {
			var masked = '*'.repeat(key.length - 4) + key.slice(-4);
			$('#api_key_display').val(masked);
		} else if (key) {
			$('#api_key_display').val('*'.repeat(key.length));
		} else {
			$('#api_key_display').val('');
		}
	}

	// Función para mostrar resultado
	function showResult(message, type) {
		var $result = $('#api-key-save-result');
		$result.removeClass('success error loading').addClass(type);
		$result.text(message).show();

		if (type !== 'loading') {
			setTimeout(function() {
				$result.fadeOut();
			}, 5000);
		}
	}

	// Botón Editar/Configurar
	$('#edit-api-key, #add-api-key').on('click', function() {
		originalApiKey = $('#api_key_edit').val();
		toggleEditMode(true);
	});

	// Botón Cancelar
	$('#cancel-edit-api-key').on('click', function() {
		$('#api_key_edit').val(originalApiKey);
		toggleEditMode(false);
		$('#api-key-save-result').hide();
	});

	// Botón Guardar
	$('#save-api-key').on('click', function() {
		var apiKey = $('#api_key_edit').val().trim();

		if (!apiKey) {
			showResult('<?php esc_html_e( "Por favor, ingresa una API Key válida.", "mirrorly" ); ?>', 'error');
			return;
		}

		showResult('<?php esc_html_e( "Guardando API Key...", "mirrorly" ); ?>', 'loading');

		// Enviar a la API
		$.ajax({
			url: ajaxurl,
			type: 'POST',
			data: {
				action: 'mirrorly_save_api_key',
				api_key: apiKey,
				nonce: '<?php echo wp_create_nonce( "mirrorly_admin_nonce" ); ?>'
			},
			success: function(response) {
				if (response.success) {
					updateMaskedKey(apiKey);
					originalApiKey = apiKey;
					toggleEditMode(false);
					$('#test-connection').prop('disabled', false);
					showResult(response.data.message || '<?php esc_html_e( "API Key guardada correctamente.", "mirrorly" ); ?>', 'success');
				} else {
					showResult(response.data.message || '<?php esc_html_e( "Error al guardar la API Key.", "mirrorly" ); ?>', 'error');
				}
			},
			error: function() {
				showResult('<?php esc_html_e( "Error de conexión. Inténtalo de nuevo.", "mirrorly" ); ?>', 'error');
			}
		});
	});

	// Actualizar estado del botón de prueba cuando cambie el campo
	$('#api_key_edit').on('input', function() {
		var hasKey = $(this).val().trim().length > 0;
		$('#test-connection').prop('disabled', !hasKey);
	});
});
</script>
