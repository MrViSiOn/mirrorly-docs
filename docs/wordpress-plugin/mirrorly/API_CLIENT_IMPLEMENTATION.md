# Mirrorly API Client Implementation

## Overview

The `Mirrorly_API_Client` class has been fully implemented to handle all communication with the central Mirrorly API. This implementation covers all the requirements specified in task 7.2.

## Implemented Features

### Core API Methods

1. **Image Generation**
   - `generate_image()` - Synchronous image generation
   - `generate_image_async()` - Asynchronous image generation for better UX
   - `get_generation_status($id)` - Check status of specific generation
   - `get_generation_result($id)` - Get result of completed generation
   - `get_multiple_generation_status($ids)` - Batch status checking

2. **Authentication & Licensing**
   - `validate_license($key, $domain)` - Validate license keys
   - `register_free_license($domain)` - Register FREE version
   - `register_pro_license($key, $domain)` - Register PRO version
   - `get_auth_status()` - Check authentication status

3. **Usage & Limits Management**
   - `check_limits()` - Check current usage limits
   - `get_usage_stats()` - Get detailed usage statistics

4. **Connection & Health**
   - `test_connection()` - Test API connectivity
   - `get_api_health()` - Check API health status

### Advanced Features

1. **Error Handling & Retry Logic**
   - Comprehensive error handling with specific error codes
   - Automatic retry with exponential backoff for transient errors
   - Human-readable error messages in Spanish
   - Last error tracking for debugging

2. **Caching System**
   - Intelligent caching of API responses
   - Configurable cache duration
   - Automatic cache invalidation on configuration changes
   - Cache clearing utilities

3. **Request Optimization**
   - Multipart file upload support for images
   - Request timeout configuration
   - Image validation before upload
   - Automatic image size optimization

4. **Debugging & Logging**
   - Debug mode with detailed request/response logging
   - Performance timing tracking
   - Error logging for troubleshooting

5. **Webhook Support**
   - Webhook signature verification
   - Webhook registration/unregistration
   - Real-time update support

### Security Features

1. **Input Validation**
   - Image file validation (type, size, format)
   - API key validation
   - Domain validation

2. **Secure Communication**
   - HTTPS enforcement
   - Bearer token authentication
   - HMAC signature verification for webhooks

3. **Rate Limiting Compliance**
   - Built-in rate limit checking
   - Automatic limit enforcement
   - Usage tracking

## API Endpoints Covered

### Authentication Endpoints
- `POST /auth/register-free`
- `POST /auth/register-pro`
- `POST /auth/validate-license`
- `GET /auth/status`

### Generation Endpoints
- `POST /generate/image`
- `POST /generate/image-async`
- `GET /generate/status/{id}`
- `GET /generate/result/{id}`
- `POST /generate/status/batch`

### Limits Endpoints
- `GET /limits/current`
- `GET /limits/usage`

### Webhook Endpoints
- `POST /webhooks/register`
- `POST /webhooks/unregister`

### Health Endpoints
- `GET /health`

## Configuration Options

The API client supports the following configuration options:

```php
$api_client = new Mirrorly_API_Client();

// Basic configuration
$api_client->set_api_key('your-api-key');
$api_client->set_api_url('https://api.mirrorly.com/v1/');
$api_client->set_timeout(60); // seconds
$api_client->set_cache_duration(300); // seconds

// Debug configuration
$api_client->set_debug_mode(true);
```

## Error Handling

The API client provides comprehensive error handling:

```php
$result = $api_client->generate_image($user_image, $product_image, $product_id);

if (is_wp_error($result)) {
    $error_code = $result->get_error_code();
    $error_message = $result->get_error_message();
    $error_data = $result->get_error_data();

    // Handle specific error types
    switch ($error_code) {
        case 'rate_limit_exceeded':
            // Show rate limit message
            break;
        case 'unauthorized':
            // Show API key error
            break;
        // ... other error types
    }
}
```

## Usage Examples

### Basic Image Generation
```php
$api_client = new Mirrorly_API_Client();
$result = $api_client->generate_image(
    '/path/to/user/image.jpg',
    '/path/to/product/image.jpg',
    123, // product ID
    array('style' => 'realistic', 'quality' => 'high')
);
```

### Asynchronous Generation
```php
// Start generation
$result = $api_client->generate_image_async($user_image, $product_image, $product_id);
$generation_id = $result['generationId'];

// Check status later
$status = $api_client->get_generation_status($generation_id);
if ($status['status'] === 'completed') {
    $final_result = $api_client->get_generation_result($generation_id);
}
```

### License Management
```php
// Register FREE license
$result = $api_client->register_free_license();

// Validate existing license
$validation = $api_client->validate_license('license-key', 'example.com');

// Check usage limits
$limits = $api_client->check_limits();
```

## Testing

A comprehensive test suite is included in `tests/test-api-client.php` that verifies:

- Class instantiation
- Configuration methods
- Error handling
- Input validation
- Webhook signature verification

Run tests with:
```bash
php tests/test-api-client.php
```

## Requirements Compliance

This implementation satisfies all requirements from task 7.2:

✅ **Crear clase para manejar todas las llamadas a la API Node.js**
- Complete API client class with all necessary methods

✅ **Implementar métodos para generación, validación de licencias y consulta de límites**
- All core methods implemented with proper error handling

✅ **Crear sistema de manejo de errores y timeouts**
- Comprehensive error handling, retry logic, and timeout management

✅ **Implementar cache temporal de respuestas para optimizar performance**
- Intelligent caching system with configurable duration

The API client is production-ready and provides a robust foundation for the WordPress plugin's communication with the central API.