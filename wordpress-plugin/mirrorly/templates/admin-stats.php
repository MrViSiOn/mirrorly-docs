<?php
/**
 * Admin Stats Template
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>

<div class="wrap">
	<h1><?php _e( 'Estadísticas de Mirrorly', 'mirrorly' ); ?></h1>

	<div class="mirrorly-stats-grid">
		<div class="mirrorly-stats-main">

			<!-- Usage Overview -->
			<div class="mirrorly-stats-card">
				<h2><?php _e( 'Resumen de Uso', 'mirrorly' ); ?></h2>

				<?php if ( is_wp_error( $usage_stats ) ) : ?>
					<div class="mirrorly-error-message">
						<p><?php echo esc_html( $usage_stats->get_error_message() ); ?></p>
						<p><a href="<?php echo admin_url( 'admin.php?page=mirrorly-settings' ); ?>"><?php _e( 'Verificar configuración', 'mirrorly' ); ?></a></p>
					</div>
				<?php else : ?>
					<div class="mirrorly-usage-metrics">
						<div class="mirrorly-metric">
							<div class="mirrorly-metric-value">
								<?php echo isset( $usage_stats['currentUsage'] ) ? esc_html( $usage_stats['currentUsage'] ) : '0'; ?>
							</div>
							<div class="mirrorly-metric-label"><?php _e( 'Generaciones este mes', 'mirrorly' ); ?></div>
						</div>

						<div class="mirrorly-metric">
							<div class="mirrorly-metric-value">
								<?php
								$remaining = $license->get_remaining_generations();
								echo $remaining === 'unlimited' ? '∞' : esc_html( $remaining );
								?>
							</div>
							<div class="mirrorly-metric-label"><?php _e( 'Generaciones restantes', 'mirrorly' ); ?></div>
						</div>

						<div class="mirrorly-metric">
							<div class="mirrorly-metric-value">
								<?php echo isset( $usage_stats['totalGenerations'] ) ? esc_html( $usage_stats['totalGenerations'] ) : '0'; ?>
							</div>
							<div class="mirrorly-metric-label"><?php _e( 'Total generaciones', 'mirrorly' ); ?></div>
						</div>

						<div class="mirrorly-metric">
							<div class="mirrorly-metric-value">
								<?php
								$license_status = $license->get_license_status();
								$monthly_limit  = $license_status['limits']['monthly_generations'];
								echo $monthly_limit === -1 ? '∞' : esc_html( $monthly_limit );
								?>
							</div>
							<div class="mirrorly-metric-label"><?php _e( 'Límite mensual', 'mirrorly' ); ?></div>
						</div>
					</div>

					<?php if ( isset( $usage_stats['currentUsage'] ) && $license_status['limits']['monthly_generations'] !== -1 ) : ?>
						<div class="mirrorly-usage-bar">
							<div class="mirrorly-usage-progress">
								<?php
								$percentage = ( $usage_stats['currentUsage'] / $license_status['limits']['monthly_generations'] ) * 100;
								$percentage = min( 100, $percentage );
								?>
								<div class="mirrorly-usage-fill" style="width: <?php echo esc_attr( $percentage ); ?>%"></div>
							</div>
							<div class="mirrorly-usage-text">
								<?php printf( __( '%d%% del límite mensual utilizado', 'mirrorly' ), round( $percentage ) ); ?>
							</div>
						</div>
					<?php endif; ?>
				<?php endif; ?>
			</div>

			<!-- Recent Generations -->
			<div class="mirrorly-stats-card">
				<h2><?php _e( 'Generaciones Recientes', 'mirrorly' ); ?></h2>

				<?php
				global $wpdb;
				$table_name = $wpdb->prefix . 'mirrorly_generations';

				$recent_generations = $wpdb->get_results(
					$wpdb->prepare(
						"
                    SELECT g.*, p.post_title as product_name
                    FROM {$table_name} g
                    LEFT JOIN {$wpdb->posts} p ON g.product_id = p.ID
                    ORDER BY g.created_at DESC
                    LIMIT %d
                ",
						10
					)
				);
				?>

				<?php if ( empty( $recent_generations ) ) : ?>
					<p class="mirrorly-no-data"><?php _e( 'No hay generaciones recientes.', 'mirrorly' ); ?></p>
				<?php else : ?>
					<div class="mirrorly-generations-table">
						<table class="wp-list-table widefat fixed striped">
							<thead>
								<tr>
									<th><?php _e( 'Producto', 'mirrorly' ); ?></th>
									<th><?php _e( 'Estado', 'mirrorly' ); ?></th>
									<th><?php _e( 'Fecha', 'mirrorly' ); ?></th>
									<th><?php _e( 'Usuario', 'mirrorly' ); ?></th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ( $recent_generations as $generation ) : ?>
									<tr>
										<td>
											<?php if ( $generation->product_name ) : ?>
												<a href="<?php echo get_edit_post_link( $generation->product_id ); ?>">
													<?php echo esc_html( $generation->product_name ); ?>
												</a>
											<?php else : ?>
												<?php printf( __( 'Producto #%d', 'mirrorly' ), $generation->product_id ); ?>
											<?php endif; ?>
										</td>
										<td>
											<span class="mirrorly-status-badge mirrorly-status-<?php echo esc_attr( $generation->status ); ?>">
												<?php
												switch ( $generation->status ) {
													case 'completed':
														_e( 'Completado', 'mirrorly' );
														break;
													case 'failed':
														_e( 'Fallido', 'mirrorly' );
														break;
													case 'processing':
														_e( 'Procesando', 'mirrorly' );
														break;
													default:
														_e( 'Pendiente', 'mirrorly' );
												}
												?>
											</span>
										</td>
										<td>
											<?php echo esc_html( mysql2date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $generation->created_at ) ); ?>
										</td>
										<td>
											<?php
											if ( $generation->user_id ) {
												$user = get_user_by( 'id', $generation->user_id );
												echo $user ? esc_html( $user->display_name ) : __( 'Usuario eliminado', 'mirrorly' );
											} else {
												_e( 'Invitado', 'mirrorly' );
											}
											?>
										</td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				<?php endif; ?>
			</div>

			<!-- Popular Products -->
			<div class="mirrorly-stats-card">
				<h2><?php _e( 'Productos Más Populares', 'mirrorly' ); ?></h2>

				<?php
				$popular_products = $wpdb->get_results(
					"
                    SELECT g.product_id, p.post_title as product_name, COUNT(*) as generation_count
                    FROM {$table_name} g
                    LEFT JOIN {$wpdb->posts} p ON g.product_id = p.ID
                    WHERE g.status = 'completed'
                    GROUP BY g.product_id
                    ORDER BY generation_count DESC
                    LIMIT 5
                "
				);
				?>

				<?php if ( empty( $popular_products ) ) : ?>
					<p class="mirrorly-no-data"><?php _e( 'No hay datos de productos populares aún.', 'mirrorly' ); ?></p>
				<?php else : ?>
					<div class="mirrorly-popular-products">
						<?php foreach ( $popular_products as $product ) : ?>
							<div class="mirrorly-popular-product">
								<div class="mirrorly-product-info">
									<strong>
										<?php if ( $product->product_name ) : ?>
											<a href="<?php echo get_edit_post_link( $product->product_id ); ?>">
												<?php echo esc_html( $product->product_name ); ?>
											</a>
										<?php else : ?>
											<?php printf( __( 'Producto #%d', 'mirrorly' ), $product->product_id ); ?>
										<?php endif; ?>
									</strong>
								</div>
								<div class="mirrorly-product-count">
									<?php printf( _n( '%d generación', '%d generaciones', $product->generation_count, 'mirrorly' ), $product->generation_count ); ?>
								</div>
							</div>
						<?php endforeach; ?>
					</div>
				<?php endif; ?>
			</div>
		</div>

		<div class="mirrorly-stats-sidebar">
			<!-- License Info -->
			<div class="mirrorly-stats-card">
				<h3><?php _e( 'Información de Licencia', 'mirrorly' ); ?></h3>

				<?php $license_status = $license->get_license_status(); ?>

				<div class="mirrorly-license-info">
					<p>
						<strong><?php _e( 'Tipo:', 'mirrorly' ); ?></strong>
						<span class="mirrorly-license-type mirrorly-license-<?php echo esc_attr( $license_status['type'] ); ?>">
							<?php echo $license_status['is_pro'] ? __( 'PRO', 'mirrorly' ) : __( 'FREE', 'mirrorly' ); ?>
						</span>
					</p>

					<div class="mirrorly-license-limits">
						<h4><?php _e( 'Límites actuales:', 'mirrorly' ); ?></h4>
						<ul>
							<li>
								<strong><?php _e( 'Generaciones mensuales:', 'mirrorly' ); ?></strong>
								<?php
								$monthly_limit = $license_status['limits']['monthly_generations'];
								echo $monthly_limit === -1 ? __( 'Ilimitadas', 'mirrorly' ) : $monthly_limit;
								?>
							</li>
							<li>
								<strong><?php _e( 'Productos máximos:', 'mirrorly' ); ?></strong>
								<?php
								$max_products = $license_status['limits']['max_products'];
								echo $max_products === -1 ? __( 'Ilimitados', 'mirrorly' ) : $max_products;
								?>
							</li>
							<li>
								<strong><?php _e( 'Personalización:', 'mirrorly' ); ?></strong>
								<?php echo $license_status['limits']['custom_styling'] ? __( 'Sí', 'mirrorly' ) : __( 'No', 'mirrorly' ); ?>
							</li>
						</ul>
					</div>

					<?php if ( ! $license_status['is_pro'] ) : ?>
						<div class="mirrorly-upgrade-prompt">
							<p><?php _e( '¿Necesitas más generaciones?', 'mirrorly' ); ?></p>
							<a href="<?php echo admin_url( 'admin.php?page=mirrorly-settings' ); ?>" class="button button-primary">
								<?php _e( 'Actualizar a PRO', 'mirrorly' ); ?>
							</a>
						</div>
					<?php endif; ?>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="mirrorly-stats-card">
				<h3><?php _e( 'Acciones Rápidas', 'mirrorly' ); ?></h3>

				<div class="mirrorly-quick-actions">
					<a href="<?php echo admin_url( 'admin.php?page=mirrorly-settings' ); ?>" class="button">
						<?php _e( 'Configuración', 'mirrorly' ); ?>
					</a>

					<a href="<?php echo admin_url( 'edit.php?post_type=product' ); ?>" class="button">
						<?php _e( 'Gestionar Productos', 'mirrorly' ); ?>
					</a>

					<a href="https://docs.mirrorly.com" target="_blank" class="button">
						<?php _e( 'Documentación', 'mirrorly' ); ?>
					</a>

					<a href="https://mirrorly.com/support" target="_blank" class="button">
						<?php _e( 'Soporte', 'mirrorly' ); ?>
					</a>
				</div>
			</div>

			<!-- System Status -->
			<div class="mirrorly-stats-card">
				<h3><?php _e( 'Estado del Sistema', 'mirrorly' ); ?></h3>

				<div class="mirrorly-system-status">
					<?php
					$api_client      = new Mirrorly_API_Client();
					$connection_test = $api_client->check_limits();
					?>

					<div class="mirrorly-status-item">
						<span class="mirrorly-status-label"><?php _e( 'Conexión API:', 'mirrorly' ); ?></span>
						<span class="mirrorly-status-value mirrorly-status-<?php echo is_wp_error( $connection_test ) ? 'error' : 'success'; ?>">
							<?php echo is_wp_error( $connection_test ) ? __( 'Error', 'mirrorly' ) : __( 'OK', 'mirrorly' ); ?>
						</span>
					</div>

					<div class="mirrorly-status-item">
						<span class="mirrorly-status-label"><?php _e( 'WooCommerce:', 'mirrorly' ); ?></span>
						<span class="mirrorly-status-value mirrorly-status-<?php echo class_exists( 'WooCommerce' ) ? 'success' : 'error'; ?>">
							<?php echo class_exists( 'WooCommerce' ) ? __( 'Activo', 'mirrorly' ) : __( 'Inactivo', 'mirrorly' ); ?>
						</span>
					</div>

					<div class="mirrorly-status-item">
						<span class="mirrorly-status-label"><?php _e( 'Versión Plugin:', 'mirrorly' ); ?></span>
						<span class="mirrorly-status-value"><?php echo esc_html( MIRRORLY_VERSION ); ?></span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
.mirrorly-stats-grid {
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 20px;
	margin-top: 20px;
}

.mirrorly-stats-main {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.mirrorly-stats-sidebar {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.mirrorly-stats-card {
	background: #fff;
	border: 1px solid #ccd0d4;
	border-radius: 4px;
	padding: 20px;
}

.mirrorly-stats-card h2,
.mirrorly-stats-card h3 {
	margin-top: 0;
	margin-bottom: 15px;
	color: #23282d;
}

.mirrorly-usage-metrics {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 20px;
	margin-bottom: 20px;
}

.mirrorly-metric {
	text-align: center;
	padding: 15px;
	background: #f9f9f9;
	border-radius: 4px;
}

.mirrorly-metric-value {
	font-size: 32px;
	font-weight: bold;
	color: #007cba;
	line-height: 1;
	margin-bottom: 5px;
}

.mirrorly-metric-label {
	font-size: 14px;
	color: #666;
}

.mirrorly-usage-bar {
	margin-top: 20px;
}

.mirrorly-usage-progress {
	height: 20px;
	background: #f0f0f0;
	border-radius: 10px;
	overflow: hidden;
	margin-bottom: 8px;
}

.mirrorly-usage-fill {
	height: 100%;
	background: linear-gradient(90deg, #007cba, #005a87);
	border-radius: 10px;
	transition: width 0.3s ease;
}

.mirrorly-usage-text {
	font-size: 14px;
	color: #666;
	text-align: center;
}

.mirrorly-status-badge {
	padding: 4px 8px;
	border-radius: 12px;
	font-size: 12px;
	font-weight: 500;
}

.mirrorly-status-completed {
	background: #d4edda;
	color: #155724;
}

.mirrorly-status-failed {
	background: #f8d7da;
	color: #721c24;
}

.mirrorly-status-processing {
	background: #d1ecf1;
	color: #0c5460;
}

.mirrorly-status-pending {
	background: #fff3cd;
	color: #856404;
}

.mirrorly-popular-products {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.mirrorly-popular-product {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px;
	background: #f9f9f9;
	border-radius: 4px;
}

.mirrorly-product-count {
	font-size: 14px;
	color: #666;
}

.mirrorly-license-type {
	padding: 4px 8px;
	border-radius: 12px;
	font-size: 12px;
	font-weight: 500;
}

.mirrorly-license-free {
	background: #fff3cd;
	color: #856404;
}

.mirrorly-license-pro_basic,
.mirrorly-license-pro_premium {
	background: #d4edda;
	color: #155724;
}

.mirrorly-license-limits ul {
	margin: 10px 0;
	padding-left: 20px;
}

.mirrorly-license-limits li {
	margin: 5px 0;
	font-size: 14px;
}

.mirrorly-upgrade-prompt {
	margin-top: 15px;
	padding: 15px;
	background: #f0f8ff;
	border-radius: 4px;
	text-align: center;
}

.mirrorly-quick-actions {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.mirrorly-system-status {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.mirrorly-status-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 0;
	border-bottom: 1px solid #eee;
}

.mirrorly-status-item:last-child {
	border-bottom: none;
}

.mirrorly-status-label {
	font-size: 14px;
	color: #666;
}

.mirrorly-status-value {
	font-size: 14px;
	font-weight: 500;
}

.mirrorly-status-success {
	color: #155724;
}

.mirrorly-status-error {
	color: #721c24;
}

.mirrorly-no-data {
	text-align: center;
	color: #666;
	font-style: italic;
	padding: 20px;
}

.mirrorly-error-message {
	background: #f8d7da;
	color: #721c24;
	padding: 15px;
	border-radius: 4px;
	border: 1px solid #f5c6cb;
}

@media (max-width: 1200px) {
	.mirrorly-stats-grid {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 768px) {
	.mirrorly-usage-metrics {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 480px) {
	.mirrorly-usage-metrics {
		grid-template-columns: 1fr;
	}

	.mirrorly-popular-product {
		flex-direction: column;
		align-items: flex-start;
		gap: 5px;
	}
}
</style>
