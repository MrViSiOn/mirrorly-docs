/**
 * Mirrorly Admin JavaScript
 */

(function ($) {
	'use strict';

	$( document ).ready(
		function () {
			// Initialize admin functionality
			MirrorlyAdmin.init();
		}
	);

	var MirrorlyAdmin = {

		init: function () {
			this.initColorPickers();
			this.initLicenseValidation();
			this.initConnectionTest();
			this.initProductSelector();
			this.initImagePreview();
			this.initStylePreview();
			this.initProductMessages();
			this.initRangeSliders();
			this.initApiKeyManagement();
		},

		/**
		 * Initialize color pickers
		 */
		initColorPickers: function () {
			if ($.fn.wpColorPicker) {
				$( '.mirrorly-color-picker' ).wpColorPicker(
					{
						change: function (event, ui) {
							// Update preview if needed
							MirrorlyAdmin.updateColorPreview();
						}
					}
				);
			}
		},

		/**
		 * Initialize license validation
		 */
		initLicenseValidation: function () {
			$( '#validate-license' ).on(
				'click',
				function (e) {
					e.preventDefault();

					var $button    = $( this );
					var $input     = $( '#license_key' );
					var $result    = $( '#license-validation-result' );
					var licenseKey = $input.val().trim();

					if ( ! licenseKey) {
						MirrorlyAdmin.showValidationResult( $result, 'error', mirrorly_admin.strings.license_invalid );
						return;
					}

					// Show loading state
					$button.prop( 'disabled', true ).text( mirrorly_admin.strings.validating );
					$result.removeClass( 'success error' ).addClass( 'loading' ).text( 'Validando licencia...' ).show();

					// Make AJAX request
					$.ajax(
						{
							url: mirrorly_admin.ajax_url,
							type: 'POST',
							data: {
								action: 'mirrorly_validate_license',
								license_key: licenseKey,
								nonce: mirrorly_admin.nonce
							},
							success: function (response) {
								if (response.success) {
									MirrorlyAdmin.showValidationResult( $result, 'success', response.data );
									// Optionally reload page to show updated status
									setTimeout(
										function () {
											location.reload();
										},
										2000
									);
								} else {
									MirrorlyAdmin.showValidationResult( $result, 'error', response.data );
								}
							},
							error: function () {
								MirrorlyAdmin.showValidationResult( $result, 'error', 'Error de conexión. Inténtalo de nuevo.' );
							},
							complete: function () {
								$button.prop( 'disabled', false ).text( 'Validar' );
							}
						}
					);
				}
			);
		},

		/**
		 * Initialize connection test
		 */
		initConnectionTest: function () {
			$( '#test-connection' ).on(
				'click',
				function (e) {
					e.preventDefault();

					var $button = $( this );
					var $result = $( '#connection-test-result' );

					// Show loading state
					$button.prop( 'disabled', true ).text( mirrorly_admin.strings.testing_connection );
					$result.removeClass( 'success error' ).addClass( 'loading' ).text( 'Probando conexión...' ).show();

					// Make AJAX request
					$.ajax(
						{
							url: mirrorly_admin.ajax_url,
							type: 'POST',
							data: {
								action: 'mirrorly_test_api_connection',
								nonce: mirrorly_admin.nonce
							},
							success: function (response) {
								if (response.success) {
									MirrorlyAdmin.showValidationResult( $result, 'success', response.data );
								} else {
									MirrorlyAdmin.showValidationResult( $result, 'error', response.data );
								}
							},
							error: function () {
								MirrorlyAdmin.showValidationResult( $result, 'error', 'Error de conexión. Verifica tu configuración.' );
							},
							complete: function () {
								$button.prop( 'disabled', false ).text( 'Probar Conexión' );
							}
						}
					);
				}
			);
		},

		/**
		 * Initialize product selector
		 */
		initProductSelector: function () {
			$( '#select-products' ).on(
				'click',
				function (e) {
					e.preventDefault();
					MirrorlyAdmin.openProductSelector();
				}
			);

			// Remove product functionality
			$( document ).on(
				'click',
				'.remove-product',
				function (e) {
					e.preventDefault();
					$( this ).closest( '.selected-product' ).remove();
				}
			);
		},

		/**
		 * Initialize image preview in product meta
		 */
		initImagePreview: function () {
			$( '#_mirrorly_image' ).on(
				'change',
				function () {
					var imageId  = $( this ).val();
					var $preview = $( '#mirrorly-image-preview' );

					if (imageId) {
						// Get image URL via AJAX
						$.post(
							ajaxurl,
							{
								action: 'mirrorly_get_image_url',
								image_id: imageId,
								size: 'thumbnail',
								nonce: $( '#mirrorly_product_meta_nonce' ).val()
							},
							function (response) {
								if (response.success && response.data.url) {
									if ($preview.length) {
										$preview.attr( 'src', response.data.url );
									} else {
										$( '#_mirrorly_image' ).after( '<br><img id="mirrorly-image-preview" src="' + response.data.url + '" style="max-width: 100px; height: auto; margin-top: 5px;" />' );
									}
								}
							}
						);
					} else {
						$preview.remove();
					}
				}
			);
		},

		/**
		 * Show validation result
		 */
		showValidationResult: function ($element, type, message) {
			$element.removeClass( 'loading success error' ).addClass( type ).text( message ).show();

			// Auto-hide after 5 seconds
			setTimeout(
				function () {
					$element.fadeOut();
				},
				5000
			);
		},

		/**
		 * Initialize style preview
		 */
		initStylePreview: function () {
			// Update preview when colors change
			$( '.mirrorly-color-picker' ).on(
				'change',
				function () {
					MirrorlyAdmin.updatePreview();
				}
			);

			// Update preview when styling options change
			$( 'select[name*="widget_styling"], input[name*="widget_styling"]' ).on(
				'change input',
				function () {
					MirrorlyAdmin.updatePreview();
				}
			);
		},

		/**
		 * Initialize product messages
		 */
		initProductMessages: function () {
			$( document ).on(
				'click',
				'.save-product-message',
				function (e) {
					e.preventDefault();

					var $button   = $( this );
					var $status   = $button.siblings( '.save-status' );
					var productId = $button.data( 'product-id' );
					var message   = $button.siblings( 'textarea' ).val();

					$button.prop( 'disabled', true ).text( 'Guardando...' );
					$status.hide();

					$.ajax(
						{
							url: ajaxurl,
							type: 'POST',
							data: {
								action: 'mirrorly_save_product_message',
								product_id: productId,
								message: message,
								nonce: mirrorly_admin.nonce
							},
							success: function (response) {
								if (response.success) {
									$status.removeClass( 'error' ).addClass( 'success' ).text( response.data ).show();
								} else {
									$status.removeClass( 'success' ).addClass( 'error' ).text( response.data ).show();
								}
							},
							error: function () {
								$status.removeClass( 'success' ).addClass( 'error' ).text( mirrorly_admin.strings.message_save_error ).show();
							},
							complete: function () {
								$button.prop( 'disabled', false ).text( 'Guardar' );
								setTimeout(
									function () {
										$status.fadeOut();
									},
									3000
								);
							}
						}
					);
				}
			);
		},

		/**
		 * Initialize range sliders
		 */
		initRangeSliders: function () {
			$( 'input[type="range"]' ).on(
				'input',
				function () {
					var $this = $( this );
					var value = $this.val();
					$this.siblings( '.range-value' ).text( value + 'px' );
				}
			);
		},

		/**
		 * Update color preview
		 */
		updateColorPreview: function () {
			this.updatePreview();
		},

		/**
		 * Update live preview
		 */
		updatePreview: function () {
			var colors  = {};
			var styling = {};

			// Get current color values
			$( '.mirrorly-color-picker' ).each(
				function () {
					var $this = $( this );
					var name  = $this.attr( 'name' );
					if (name) {
						var colorKey = name.match( /\[([^\]]+)\]$/ );
						if (colorKey) {
							colors[colorKey[1]] = $this.val();
						}
					}
				}
			);

			// Get current styling values
			$( 'select[name*="widget_styling"], input[name*="widget_styling"]' ).each(
				function () {
					var $this = $( this );
					var name  = $this.attr( 'name' );
					if (name) {
						var styleKey = name.match( /\[([^\]]+)\]$/ );
						if (styleKey) {
							styling[styleKey[1]] = $this.val();
						}
					}
				}
			);

			// Update preview via AJAX
			$.ajax(
				{
					url: ajaxurl,
					type: 'POST',
					data: {
						action: 'mirrorly_preview_widget',
						colors: colors,
						styling: styling,
						nonce: mirrorly_admin.nonce
					},
					success: function (response) {
						if (response.success) {
							$( '#mirrorly-widget-preview' ).html( response.data );

							// Add animation class based on selected animation
							var animation = styling.animation || 'fade';
							if (animation !== 'none') {
								$( '#mirrorly-widget-preview .mirrorly-widget-preview' ).addClass( 'animation-' + animation );
							}
						}
					}
				}
			);
		},

		/**
		 * Open product selector modal
		 */
		openProductSelector: function () {
			// Create a simple modal for product selection
			var modal = $( '<div class="mirrorly-modal-overlay"><div class="mirrorly-modal"><div class="mirrorly-modal-header"><h3>Seleccionar Productos</h3><button class="mirrorly-modal-close">&times;</button></div><div class="mirrorly-modal-body"><div class="mirrorly-product-search"><input type="text" placeholder="Buscar productos..." id="mirrorly-product-search"><div class="mirrorly-product-list" id="mirrorly-product-list">Cargando productos...</div></div></div><div class="mirrorly-modal-footer"><button class="button button-primary" id="mirrorly-add-selected">Agregar Seleccionados</button><button class="button" id="mirrorly-modal-cancel">Cancelar</button></div></div></div>' );

			$( 'body' ).append( modal );

			// Load products
			this.loadProducts();

			// Modal events
			$( '.mirrorly-modal-close, #mirrorly-modal-cancel' ).on(
				'click',
				function () {
					modal.remove();
				}
			);

			$( '.mirrorly-modal-overlay' ).on(
				'click',
				function (e) {
					if (e.target === this) {
						modal.remove();
					}
				}
			);

			$( '#mirrorly-add-selected' ).on(
				'click',
				function () {
					MirrorlyAdmin.addSelectedProducts();
					modal.remove();
				}
			);

			// Search functionality
			$( '#mirrorly-product-search' ).on(
				'input',
				function () {
					var query = $( this ).val();
					MirrorlyAdmin.searchProducts( query );
				}
			);
		},

		/**
		 * Load products for selector
		 */
		loadProducts: function () {
			$.ajax(
				{
					url: ajaxurl,
					type: 'POST',
					data: {
						action: 'mirrorly_load_products',
						nonce: mirrorly_admin.nonce
					},
					success: function (response) {
						if (response.success) {
							MirrorlyAdmin.displayProducts( response.data );
						} else {
							$( '#mirrorly-product-list' ).html( '<p>Error al cargar productos.</p>' );
						}
					},
					error: function () {
						$( '#mirrorly-product-list' ).html( '<p>Error de conexión.</p>' );
					}
				}
			);
		},

		/**
		 * Display products in selector
		 */
		displayProducts: function (products) {
			var html = '';

			if (products.length === 0) {
				html = '<p>No se encontraron productos.</p>';
			} else {
				html = '<div class="mirrorly-products-grid">';
				products.forEach(
					function (product) {
						var selected = MirrorlyAdmin.isProductSelected( product.id ) ? 'checked' : '';
						html        += '<div class="mirrorly-product-item">';
						html        += '<label>';
						html        += '<input type="checkbox" value="' + product.id + '" ' + selected + '>';
						html        += '<img src="' + product.image + '" alt="' + product.name + '">';
						html        += '<span>' + product.name + '</span>';
						html        += '</label>';
						html        += '</div>';
					}
				);
				html += '</div>';
			}

			$( '#mirrorly-product-list' ).html( html );
		},

		/**
		 * Search products
		 */
		searchProducts: function (query) {
			$.ajax(
				{
					url: ajaxurl,
					type: 'POST',
					data: {
						action: 'mirrorly_search_products',
						query: query,
						nonce: mirrorly_admin.nonce
					},
					success: function (response) {
						if (response.success) {
							MirrorlyAdmin.displayProducts( response.data );
						}
					}
				}
			);
		},

		/**
		 * Check if product is already selected
		 */
		isProductSelected: function (productId) {
			return $( '#selected-products-list' ).find( '[data-product-id="' + productId + '"]' ).length > 0;
		},

		/**
		 * Add selected products to the list
		 */
		addSelectedProducts: function () {
			var selectedProducts = [];
			$( '.mirrorly-product-item input:checked' ).each(
				function () {
					var productId   = $( this ).val();
					var productName = $( this ).siblings( 'span' ).text();

					if ( ! MirrorlyAdmin.isProductSelected( productId )) {
						selectedProducts.push(
							{
								id: productId,
								name: productName
							}
						);
					}
				}
			);

			selectedProducts.forEach(
				function (product) {
					var html = '<div class="selected-product" data-product-id="' + product.id + '">';
					html    += '<span>' + product.name + '</span>';
					html    += '<button type="button" class="remove-product">×</button>';
					html    += '<input type="hidden" name="mirrorly_options[enabled_products][]" value="' + product.id + '" />';
					html    += '</div>';

					$( '#selected-products-list' ).append( html );
				}
			);
		},

		/**
		 * Initialize API Key management functionality
		 */
		initApiKeyManagement: function () {
			// Edit API Key button
			$( document ).on( 'click', '#edit-api-key', function(e) {
				e.preventDefault();
				
				var $container = $( '#api-key-container' );
				var $maskedField = $container.find( '.api-key-masked' );
				var $inputField = $container.find( '.api-key-input' );
				var $editBtn = $container.find( '#edit-api-key' );
				var $saveBtn = $container.find( '#save-api-key' );
				var $cancelBtn = $container.find( '#cancel-api-key' );
				
				// Show input field, hide masked field
				$maskedField.hide();
				$inputField.show();
				$editBtn.hide();
				$saveBtn.show();
				$cancelBtn.show();
				
				// Focus on input
				$inputField.find( 'input' ).focus();
			});
			
			// Cancel API Key edit
			$( document ).on( 'click', '#cancel-api-key', function(e) {
				e.preventDefault();
				
				var $container = $( '#api-key-container' );
				var $maskedField = $container.find( '.api-key-masked' );
				var $inputField = $container.find( '.api-key-input' );
				var $editBtn = $container.find( '#edit-api-key' );
				var $saveBtn = $container.find( '#save-api-key' );
				var $cancelBtn = $container.find( '#cancel-api-key' );
				
				// Hide input field, show masked field
				$inputField.hide();
				$maskedField.show();
				$saveBtn.hide();
				$cancelBtn.hide();
				$editBtn.show();
				
				// Reset input value to original
				var originalValue = $inputField.find( 'input' ).data( 'original-value' ) || '';
				$inputField.find( 'input' ).val( originalValue );
			});
			
			// Save API Key
			$( document ).on( 'click', '#save-api-key', function(e) {
				e.preventDefault();
				
				var $button = $( this );
				var $container = $( '#api-key-container' );
				var $input = $container.find( '.api-key-input input' );
				var $result = $( '#api-key-save-result' );
				var apiKey = $input.val().trim();
				
				if ( !apiKey ) {
					MirrorlyAdmin.showValidationResult( $result, 'error', 'La API Key no puede estar vacía.' );
					return;
				}
				
				// Validate API Key format
				if ( !/^AIza[0-9A-Za-z-_]{35}$/.test( apiKey ) ) {
					MirrorlyAdmin.showValidationResult( $result, 'error', 'Formato de API Key inválido.' );
					return;
				}
				
				// Show loading state
				$button.prop( 'disabled', true ).text( 'Guardando...' );
				$result.removeClass( 'success error' ).addClass( 'loading' ).text( 'Guardando API Key...' ).show();
				
				// Make AJAX request
				$.ajax({
					url: mirrorly_admin.ajax_url,
					type: 'POST',
					data: {
						action: 'mirrorly_save_api_key',
						api_key: apiKey,
						nonce: mirrorly_admin.nonce
					},
					success: function( response ) {
						if ( response.success ) {
							MirrorlyAdmin.showValidationResult( $result, 'success', response.data.message );
							
							// Update masked display
							var $maskedSpan = $container.find( '.api-key-masked span' );
							$maskedSpan.text( response.data.masked_key );
							
							// Store original value
							$input.data( 'original-value', apiKey );
							
							// Hide input, show masked
							var $maskedField = $container.find( '.api-key-masked' );
							var $inputField = $container.find( '.api-key-input' );
							var $editBtn = $container.find( '#edit-api-key' );
							var $saveBtn = $container.find( '#save-api-key' );
							var $cancelBtn = $container.find( '#cancel-api-key' );
							
							$inputField.hide();
							$maskedField.show();
							$saveBtn.hide();
							$cancelBtn.hide();
							$editBtn.show();
							
							// Hide result after 3 seconds
							setTimeout( function() {
								$result.fadeOut();
							}, 3000 );
						} else {
							MirrorlyAdmin.showValidationResult( $result, 'error', response.data );
						}
					},
					error: function() {
						MirrorlyAdmin.showValidationResult( $result, 'error', 'Error de conexión. Inténtalo de nuevo.' );
					},
					complete: function() {
						$button.prop( 'disabled', false ).text( 'Guardar' );
					}
				});
			});
		}
	};

	// Add modal styles
	$( '<style>' )
	.prop( 'type', 'text/css' )
	.html(
		`
			.mirrorly - modal - overlay {
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba( 0,0,0,0.7 );
				z - index: 100000;
				display: flex;
				align - items: center;
				justify - content: center;
			}
			.mirrorly - modal {
				background: #fff;
				border - radius: 8px;
				width: 90 % ;
				max - width: 800px;
				max - height: 80vh;
				display: flex;
				flex - direction: column;
			}
			.mirrorly - modal - header {
				padding: 20px;
				border - bottom: 1px solid #eee;
				display: flex;
				justify - content: space - between;
				align - items: center;
			}
			.mirrorly - modal - header h3 {
				margin: 0;
			}
			.mirrorly - modal - close {
				background: none;
				border: none;
				font - size: 24px;
				cursor: pointer;
				padding: 0;
				width: 30px;
				height: 30px;
				display: flex;
				align - items: center;
				justify - content: center;
			}
			.mirrorly - modal - body {
				padding: 20px;
				flex: 1;
				overflow - y: auto;
			}
			.mirrorly - modal - footer {
				padding: 20px;
				border - top: 1px solid #eee;
				display: flex;
				gap: 10px;
				justify - content: flex - end;
			}
			.mirrorly - product - search input {
				width: 100 % ;
				padding: 10px;
				border: 1px solid #ddd;
				border - radius: 4px;
				margin - bottom: 20px;
			}
			.mirrorly - products - grid {
				display: grid;
				grid - template - columns: repeat( auto - fill, minmax( 200px, 1fr ) );
				gap: 15px;
			}
			.mirrorly - product - item {
				border: 1px solid #ddd;
				border - radius: 4px;
				padding: 10px;
				text - align: center;
			}
			.mirrorly - product - item label {
				display: block;
				cursor: pointer;
			}
			.mirrorly - product - item img {
				width: 60px;
				height: 60px;
				object - fit: cover;
				border - radius: 4px;
				margin: 10px 0;
			}
			.mirrorly - product - item span {
				display: block;
				font - size: 14px;
				margin - top: 5px;
			}
			.mirrorly - product - item input[type = "checkbox"] {
				margin - bottom: 10px;
			}
		`
	)
	.appendTo( 'head' );

})( jQuery );