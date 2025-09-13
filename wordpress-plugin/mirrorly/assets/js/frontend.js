/**
 * Mirrorly Frontend JavaScript
 */

(function ($) {
	'use strict';

	$( document ).ready(
		function () {
			// Initialize frontend functionality
			MirrorlyFrontend.init();
		}
	);

	var MirrorlyFrontend = {

		// Current state
		currentFile: null,
		isGenerating: false,
		currentGenerationId: null,
		statusCheckInterval: null,
		retryCount: 0,
		maxRetries: 3,

		// Performance tracking
		startTime: null,

		// Cached elements
		$widget: null,
		$fileInput: null,
		$uploadArea: null,

		init: function () {
			// Cache frequently used elements
			this.$widget     = $( '.mirrorly-widget' );
			this.$fileInput  = $( '#mirrorly-file-input' );
			this.$uploadArea = $( '#mirrorly-upload-area' );

			// Add entrance animation
			this.addEntranceAnimation();

			this.initFileUpload();
			this.initDragAndDrop();
			this.initButtons();
			this.initKeyboardNavigation();
			this.initIntersectionObserver();
			this.checkInitialState();

			// Preload critical resources
			this.preloadResources();
		},

		/**
		 * Add entrance animation to widget
		 */
		addEntranceAnimation: function () {
			if (this.$widget.length && mirrorly_frontend.widget_animation && mirrorly_frontend.widget_animation !== 'none') {
				// Add animation class after a small delay to ensure proper rendering
				setTimeout(
					() => {
						this.$widget.addClass( 'animation-' + mirrorly_frontend.widget_animation );
					},
					100
				);
			}
		},

		/**
		 * Initialize intersection observer for performance
		 */
		initIntersectionObserver: function () {
			if ('IntersectionObserver' in window && this.$widget.length) {
				const observer = new IntersectionObserver(
					(entries) => {
						entries.forEach(
							entry => {
								if (entry.isIntersecting) {
									// Widget is visible, can perform expensive operations
									this.$widget.addClass( 'visible' );
								}
							}
						);
					},
					{ threshold: 0.1 }
				);

				observer.observe( this.$widget[0] );
			}
		},

		/**
		 * Preload critical resources
		 */
		preloadResources: function () {
			// Preload common icons or images if needed
			if (mirrorly_frontend.preload_images) {
				mirrorly_frontend.preload_images.forEach(
					src => {
						const img = new Image();
						img.src   = src;
					}
				);
			}
		},

		/**
		 * Initialize keyboard navigation
		 */
		initKeyboardNavigation: function () {
			// Allow Enter key to trigger file selection
			this.$uploadArea.on(
				'keydown',
				(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						this.$fileInput.click();
					}
				}
			);

			// ESC key to reset
			$( document ).on(
				'keydown',
				(e) => {
					if (e.key === 'Escape' && this.currentFile && ! this.isGenerating) {
						this.resetToUpload();
					}
				}
			);
		},

		/**
		 * Check initial state and show appropriate section
		 */
		checkInitialState: function () {
			if ( ! mirrorly_frontend.can_generate) {
				this.showSection( 'limit-notice' );
			} else {
				this.showSection( 'upload' );
			}
		},

		/**
		 * Initialize file upload functionality
		 */
		initFileUpload: function () {
			var self = this;

			this.$fileInput.on(
				'change',
				function (e) {
					var file = e.target.files[0];
					if (file) {
						self.handleFileSelection( file );
					}
				}
			);

			// Click to upload
			this.$uploadArea.on(
				'click',
				function () {
					self.$fileInput.click();
				}
			);

			// Make upload area focusable for accessibility
			this.$uploadArea.attr( 'tabindex', '0' ).attr( 'role', 'button' )
			.attr( 'aria-label', mirrorly_frontend.strings.upload_image || 'Subir imagen' );
		},

		/**
		 * Initialize drag and drop functionality
		 */
		initDragAndDrop: function () {
			var self        = this;
			var $uploadArea = $( '#mirrorly-upload-area' );

			$uploadArea.on(
				'dragover dragenter',
				function (e) {
					e.preventDefault();
					e.stopPropagation();
					$( this ).addClass( 'dragover' );
				}
			);

			$uploadArea.on(
				'dragleave dragend',
				function (e) {
					e.preventDefault();
					e.stopPropagation();
					$( this ).removeClass( 'dragover' );
				}
			);

			$uploadArea.on(
				'drop',
				function (e) {
					e.preventDefault();
					e.stopPropagation();
					$( this ).removeClass( 'dragover' );

					var files = e.originalEvent.dataTransfer.files;
					if (files.length > 0) {
						self.handleFileSelection( files[0] );
					}
				}
			);
		},

		/**
		 * Initialize button functionality
		 */
		initButtons: function () {
			var self = this;

			// Change image button
			$( '#mirrorly-change-image' ).on(
				'click',
				function () {
					self.resetToUpload();
				}
			);

			// Generate button
			$( '#mirrorly-generate-btn' ).on(
				'click',
				function () {
					self.generateImage();
				}
			);

			// Download button
			$( '#mirrorly-download-btn' ).on(
				'click',
				function () {
					self.downloadImage();
				}
			);

			// Share button
			$( '#mirrorly-share-btn' ).on(
				'click',
				function () {
					self.shareImage();
				}
			);

			// Try again button
			$( '#mirrorly-try-again-btn' ).on(
				'click',
				function () {
					self.showSection( 'preview' );
				}
			);

			// Retry button
			$( '#mirrorly-retry-btn' ).on(
				'click',
				function () {
					self.generateImage();
				}
			);
		},

		/**
		 * Handle file selection
		 */
		handleFileSelection: function (file) {
			// Validate file
			var validation = this.validateFile( file );
			if ( ! validation.valid) {
				this.showError( validation.message );
				return;
			}

			this.currentFile = file;
			this.showPreview( file );
		},

		/**
		 * Validate selected file
		 */
		validateFile: function (file) {
			// Check file type
			var allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
			if ( ! allowedTypes.includes( file.type )) {
				return {
					valid: false,
					message: mirrorly_frontend.strings.invalid_file
				};
			}

			// Check file size
			var maxSize = mirrorly_frontend.license_type === 'free' ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for free, 5MB for pro
			if (file.size > maxSize) {
				return {
					valid: false,
					message: mirrorly_frontend.strings.file_too_large
				};
			}

			return { valid: true };
		},

		/**
		 * Show file preview
		 */
		showPreview: function (file) {
			var reader = new FileReader();
			var self   = this;

			reader.onload = function (e) {
				$( '#mirrorly-user-preview' ).attr( 'src', e.target.result );
				self.showSection( 'preview' );
			};

			reader.readAsDataURL( file );
		},

		/**
		 * Generate image via API
		 */
		generateImage: function () {
			if (this.isGenerating || ! this.currentFile) {
				return;
			}

			// Check if can generate
			if ( ! mirrorly_frontend.can_generate) {
				this.showError( mirrorly_frontend.strings.rate_limit_exceeded );
				return;
			}

			this.isGenerating = true;
			this.startTime    = performance.now();
			this.retryCount   = 0;

			this.showSection( 'loading' );
			this.updateProgress( 0 );

			var formData = new FormData();
			formData.append( 'action', 'mirrorly_generate_image' );
			formData.append( 'nonce', mirrorly_frontend.nonce );
			formData.append( 'product_id', mirrorly_frontend.product_id );
			formData.append( 'user_image', this.currentFile );
			formData.append( 'style', mirrorly_frontend.generation_style || 'realistic' );

			var self = this;

			// Simulate progress for better UX
			this.simulateProgress();

			$.ajax(
				{
					url: mirrorly_frontend.ajax_url,
					type: 'POST',
					data: formData,
					processData: false,
					contentType: false,
					timeout: 120000, // 2 minutes timeout
					xhr: function () {
						var xhr = new window.XMLHttpRequest();
						// Upload progress
						xhr.upload.addEventListener(
							"progress",
							function (evt) {
								if (evt.lengthComputable) {
									var percentComplete = (evt.loaded / evt.total) * 30; // Upload is 30% of total
									self.updateProgress( percentComplete );
								}
							},
							false
						);
						return xhr;
					},
					success: function (response) {
						self.updateProgress( 100 );

						if (response.success) {
							// Track performance
							if (self.startTime) {
								const duration = performance.now() - self.startTime;
								self.trackPerformance( 'generation_success', duration );
							}

							// Check if this is an async response with generation ID
							if (response.data.generation_id && response.data.status === 'pending') {
								self.currentGenerationId = response.data.generation_id;
								self.startStatusChecking();
							} else {
								// Immediate result
								self.showResult( response.data );

								// Update remaining generations
								if (response.data.remaining_generations !== undefined) {
									self.updateRemainingGenerations( response.data.remaining_generations );
								}
							}
						} else {
							self.handleGenerationError( response.data || mirrorly_frontend.strings.generation_failed );
						}
					},
					error: function (xhr, status) {
						if (status === 'timeout') {
							self.handleGenerationError( mirrorly_frontend.strings.timeout_error, true );
						} else if (status === 'error' && xhr.status >= 500) {
							self.handleGenerationError( mirrorly_frontend.strings.server_error, true );
						} else if (status === 'error' && xhr.status === 0) {
							self.handleGenerationError( mirrorly_frontend.strings.network_error, true );
						} else {
							self.handleGenerationError( mirrorly_frontend.strings.generation_failed, true );
						}
					},
					complete: function () {
						self.isGenerating = false;
					}
				}
			);
		},

		/**
		 * Handle generation errors with retry logic
		 */
		handleGenerationError: function (message, canRetry) {
			if (canRetry && this.retryCount < this.maxRetries) {
				this.retryCount++;

				// Show retry message
				$( '#mirrorly-loading .mirrorly-loading-text' ).text( 'Reintentando... (' + this.retryCount + '/' + this.maxRetries + ')' );

				// Retry after delay
				setTimeout(
					() => {
						this.generateImage();
					},
					2000 * this.retryCount
				); // Exponential backoff

				return;
			}

			// Track error
			if (this.startTime) {
				const duration = performance.now() - this.startTime;
				this.trackPerformance( 'generation_error', duration );
			}

			this.showError( message );
		},

		/**
		 * Simulate progress for better UX
		 */
		simulateProgress: function () {
			let progress   = 0;
			const interval = setInterval(
				() => {
					progress  += Math.random() * 10;
					if (progress > 70) {
						clearInterval( interval );
						return;
					}
					this.updateProgress( progress );
				},
				500
			);
		},

		/**
		 * Update progress bar
		 */
		updateProgress: function (percent) {
			const $progressBar = $( '.mirrorly-progress-bar' );
			if ($progressBar.length) {
				$progressBar.css( 'width', Math.min( percent, 100 ) + '%' );
			}
		},

		/**
		 * Track performance metrics
		 */
		trackPerformance: function (event, duration) {
			// Send analytics if available
			if (typeof gtag !== 'undefined') {
				gtag(
					'event',
					event,
					{
						'custom_parameter_1': duration,
						'event_category': 'mirrorly'
					}
				);
			}

			// Log for debugging
			console.log( 'Mirrorly Performance:', event, duration + 'ms' );
		},

		/**
		 * Show generation result
		 */
		showResult: function (data) {
			$( '#mirrorly-result-image' ).attr( 'src', data.image_url );
			this.showSection( 'result' );

			// Store result data for download/share
			this.resultData = data;
		},

		/**
		 * Download generated image
		 */
		downloadImage: function () {
			if ( ! this.resultData || ! this.resultData.image_url) {
				return;
			}

			// Create download link
			var link      = document.createElement( 'a' );
			link.href     = this.resultData.image_url;
			link.download = 'mirrorly-generated-image.jpg';
			link.target   = '_blank';

			// Trigger download
			document.body.appendChild( link );
			link.click();
			document.body.removeChild( link );
		},

		/**
		 * Share generated image
		 */
		shareImage: function () {
			if ( ! this.resultData || ! this.resultData.image_url) {
				return;
			}

			// Check if Web Share API is available
			if (navigator.share) {
				navigator.share(
					{
						title: 'Mi imagen generada con Mirrorly',
						text: '¡Mira cómo me queda este producto!',
						url: this.resultData.image_url
					}
				).catch(
					function (error) {
						console.log( 'Error sharing:', error );
					}
				);
			} else {
				// Fallback: copy to clipboard or show share options
				this.showShareOptions();
			}
		},

		/**
		 * Show share options fallback
		 */
		showShareOptions: function () {
			var imageUrl = this.resultData.image_url;
			var text     = encodeURIComponent( '¡Mira cómo me queda este producto!' );
			var url      = encodeURIComponent( imageUrl );

			var shareOptions = [
			{
				name: 'Facebook',
				url: 'https://www.facebook.com/sharer/sharer.php?u=' + url
			},
			{
				name: 'Twitter',
				url: 'https://twitter.com/intent/tweet?text=' + text + '&url=' + url
			},
			{
				name: 'WhatsApp',
				url: 'https://wa.me/?text=' + text + ' ' + url
			}
			];

			var modal = $( '<div class="mirrorly-share-modal"><div class="mirrorly-share-content"><h3>Compartir imagen</h3><div class="mirrorly-share-options"></div><button class="mirrorly-share-close">Cerrar</button></div></div>' );

			shareOptions.forEach(
				function (option) {
					modal.find( '.mirrorly-share-options' ).append(
						'<a href="' + option.url + '" target="_blank" class="mirrorly-share-option">' + option.name + '</a>'
					);
				}
			);

			$( 'body' ).append( modal );

			modal.find( '.mirrorly-share-close' ).on(
				'click',
				function () {
					modal.remove();
				}
			);

			modal.on(
				'click',
				function (e) {
					if (e.target === this) {
						modal.remove();
					}
				}
			);
		},

		/**
		 * Show error message
		 */
		showError: function (message) {
			this.stopStatusChecking();
			$( '#mirrorly-error-message' ).text( message );
			this.showSection( 'error' );
		},

		/**
		 * Reset to upload state
		 */
		resetToUpload: function () {
			this.stopStatusChecking();
			this.currentFile = null;
			$( '#mirrorly-file-input' ).val( '' );
			this.showSection( 'upload' );
		},

		/**
		 * Show specific section with smooth transitions
		 */
		showSection: function (section) {
			const sections = {
				'upload': '#mirrorly-upload-area',
				'preview': '#mirrorly-preview-section',
				'loading': '#mirrorly-loading',
				'result': '#mirrorly-result',
				'error': '#mirrorly-error'
			};

			// Add animating class for performance optimization
			this.$widget.addClass( 'animating' );

			// Hide all sections with fade out
			Object.values( sections ).forEach(
				selector => {
					const $element = $( selector );
					if ($element.is( ':visible' )) {
						$element.fadeOut( 200 );
					}
				}
			);

			// Show requested section with fade in
			setTimeout(
				() => {
					const targetSelector = sections[section];
                if (targetSelector) {
                    $( targetSelector ).fadeIn(
                    300,
                    () => {
                        // Remove animating class after animation
                        this.$widget.removeClass( 'animating' );
                        // Focus management for accessibility
                        this.manageFocus( section );
                        }
                        );
                }
                // Special handling for generation section
					if (['loading', 'result', 'error'].includes( section )) {
						$( '#mirrorly-generation-section' ).show();
					} else {
						$( '#mirrorly-generation-section' ).hide();
					}

					if (section === 'upload') {
						$( '#mirrorly-upload-area' ).parent().show();
					} else {
						$( '#mirrorly-upload-area' ).parent().hide();
					}
				},
				200
			);
		},

		/**
		 * Manage focus for accessibility
		 */
		manageFocus: function (section) {
			let focusTarget;

			switch (section) {
				case 'upload':
					focusTarget = this.$uploadArea;
				break;
				case 'preview':
					focusTarget = $( '#mirrorly-generate-btn' );
				break;
				case 'result':
					focusTarget = $( '#mirrorly-download-btn' );
				break;
				case 'error':
					focusTarget = $( '#mirrorly-try-again-btn' );
				break;
			}

			if (focusTarget && focusTarget.length) {
				focusTarget.focus();
			}
		},

		/**
		 * Update remaining generations display
		 */
		updateRemainingGenerations: function (remaining) {
			var $remaining = $( '.mirrorly-remaining strong' );
			if ($remaining.length) {
				if (remaining === 'unlimited') {
					$remaining.text( 'Ilimitadas' );
				} else {
					$remaining.text( remaining );

					// If no generations left, disable functionality
					if (remaining <= 0) {
							this.showError( mirrorly_frontend.strings.rate_limit_exceeded );
							mirrorly_frontend.can_generate = false;
					}
				}
			}
		},

		/**
		 * Start checking generation status for async generations
		 */
		startStatusChecking: function () {
			if ( ! this.currentGenerationId) {
				return;
			}

			var self = this;

			// Update loading text for async generation
			$( '#mirrorly-loading .mirrorly-loading-text' ).text( 'Procesando tu imagen...' );
			$( '#mirrorly-loading .mirrorly-loading-hint' ).text( 'Te notificaremos cuando esté lista' );

			// Check status every 3 seconds
			this.statusCheckInterval = setInterval(
				function () {
					self.checkGenerationStatus();
				},
				3000
			);

			// Also check immediately
			this.checkGenerationStatus();
		},

		/**
		 * Check generation status via AJAX
		 */
		checkGenerationStatus: function () {
			if ( ! this.currentGenerationId) {
				this.stopStatusChecking();
				return;
			}

			var self = this;

			$.ajax(
				{
					url: mirrorly_frontend.ajax_url,
					type: 'POST',
					data: {
						action: 'mirrorly_check_generation_status',
						nonce: mirrorly_frontend.nonce,
						generation_id: this.currentGenerationId
					},
					success: function (response) {
						if (response.success) {
							var data = response.data;

							if (data.status === 'completed') {
								self.stopStatusChecking();
								self.showResult( data );

								// Update remaining generations
								if (data.remaining_generations !== undefined) {
									self.updateRemainingGenerations( data.remaining_generations );
								}
							} else if (data.status === 'failed') {
								self.stopStatusChecking();
								self.showError( data.error || 'La generación falló' );
							}
							// If still processing, continue checking
						} else {
							// If there's an error checking status, stop and show error
							self.stopStatusChecking();
							self.showError( mirrorly_frontend.strings.status_check_error );
						}
					},
					error: function () {
						// Continue checking on network errors
						console.log( 'Error checking generation status, will retry...' );
					}
				}
			);
		},

		/**
		 * Stop checking generation status
		 */
		stopStatusChecking: function () {
			if (this.statusCheckInterval) {
				clearInterval( this.statusCheckInterval );
				this.statusCheckInterval = null;
			}
			this.currentGenerationId = null;
		}
	};

	// Add share modal styles
	$( '<style>' )
	.prop( 'type', 'text/css' )
	.html(
		`
			.mirrorly - share - modal {
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba( 0,0,0,0.7 );
				z - index: 10000;
				display: flex;
				align - items: center;
				justify - content: center;
			}
			.mirrorly - share - content {
				background: #fff;
				border - radius: 8px;
				padding: 20px;
				max - width: 400px;
				width: 90 % ;
				text - align: center;
			}
			.mirrorly - share - content h3 {
				margin - top: 0;
				margin - bottom: 20px;
			}
			.mirrorly - share - options {
				display: flex;
				flex - direction: column;
				gap: 10px;
				margin - bottom: 20px;
			}
			.mirrorly - share - option {
				display: block;
				padding: 10px 20px;
				background: #007cba;
				color: white;
				text - decoration: none;
				border - radius: 4px;
				transition: background 0.3s ease;
			}
			.mirrorly - share - option:hover {
				background: #005a87;
				color: white;
			}
			.mirrorly - share - close {
				background: #f5f5f5;
				border: 1px solid #ddd;
				padding: 8px 16px;
				border - radius: 4px;
				cursor: pointer;
			}
		`
	)
	.appendTo( 'head' );

})( jQuery );