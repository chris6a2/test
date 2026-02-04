<?php
/**
 * AI API Handler Class
 *
 * Handles all communication with the AI API (Claude-style completion endpoint)
 *
 * @package AI_Editorial_Agent
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class AI_Editorial_API_Handler {

    /**
     * API endpoint URL
     *
     * @var string
     */
    private string $api_endpoint = 'https://api.anthropic.com/v1/messages';

    /**
     * API model to use
     *
     * @var string
     */
    private string $model = 'claude-sonnet-4-20250514';

    /**
     * Maximum tokens for response
     *
     * @var int
     */
    private int $max_tokens = 8192;

    /**
     * Request timeout in seconds
     *
     * @var int
     */
    private int $timeout = 120;

    /**
     * Get the API key from WordPress options
     *
     * @return string|false API key or false if not set
     */
    private function get_api_key(): string|false {
        $api_key = get_option( 'ai_editorial_api_key' );

        if ( empty( $api_key ) ) {
            $this->log_error( 'API key is not configured' );
            return false;
        }

        return $api_key;
    }

    /**
     * Load the editorial system prompt
     *
     * @return string The system prompt
     */
    private function get_system_prompt(): string {
        $prompt_file = AI_EDITORIAL_AGENT_PLUGIN_DIR . 'prompts/editorial-prompt.php';

        if ( file_exists( $prompt_file ) ) {
            return include $prompt_file;
        }

        $this->log_error( 'Editorial prompt file not found' );
        return '';
    }

    /**
     * Send request to AI API and get article content
     *
     * @param string $topic Optional topic to focus on
     * @return array|WP_Error Array of articles or WP_Error on failure
     */
    public function generate_articles( string $topic = '' ): array|WP_Error {
        $api_key = $this->get_api_key();

        if ( false === $api_key ) {
            return new WP_Error(
                'api_key_missing',
                __( 'AI API key is not configured. Please add it in the settings.', 'ai-editorial-agent' )
            );
        }

        $system_prompt = $this->get_system_prompt();

        if ( empty( $system_prompt ) ) {
            return new WP_Error(
                'prompt_missing',
                __( 'Editorial system prompt is missing or empty.', 'ai-editorial-agent' )
            );
        }

        // Build the user message
        $user_message = $this->build_user_message( $topic );

        // Prepare the API request body
        $request_body = [
            'model'      => $this->model,
            'max_tokens' => $this->max_tokens,
            'system'     => $system_prompt,
            'messages'   => [
                [
                    'role'    => 'user',
                    'content' => $user_message,
                ],
            ],
        ];

        // Make the API request
        $response = $this->make_api_request( $request_body, $api_key );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        // Parse and validate the response
        return $this->parse_api_response( $response );
    }

    /**
     * Build the user message for the API request
     *
     * @param string $topic Optional topic to focus on
     * @return string The user message
     */
    private function build_user_message( string $topic = '' ): string {
        $current_date = wp_date( 'F j, Y' );

        $message = "Today's date is {$current_date}. ";

        if ( ! empty( $topic ) ) {
            $message .= "Please focus on the following topic: {$topic}. ";
        }

        $message .= "Generate the articles as specified in your instructions. Return the response as valid JSON.";

        return $message;
    }

    /**
     * Make the actual API request
     *
     * @param array  $body    Request body
     * @param string $api_key API key
     * @return array|WP_Error Response array or WP_Error
     */
    private function make_api_request( array $body, string $api_key ): array|WP_Error {
        $args = [
            'method'      => 'POST',
            'timeout'     => $this->timeout,
            'redirection' => 5,
            'httpversion' => '1.1',
            'blocking'    => true,
            'headers'     => [
                'Content-Type'      => 'application/json',
                'x-api-key'         => $api_key,
                'anthropic-version' => '2023-06-01',
            ],
            'body'        => wp_json_encode( $body ),
            'sslverify'   => true,
        ];

        $this->log_debug( 'Making API request to: ' . $this->api_endpoint );

        $response = wp_remote_post( $this->api_endpoint, $args );

        // Check for WordPress HTTP errors
        if ( is_wp_error( $response ) ) {
            $this->log_error( 'API request failed: ' . $response->get_error_message() );
            return $response;
        }

        $response_code = wp_remote_retrieve_response_code( $response );
        $response_body = wp_remote_retrieve_body( $response );

        // Check for HTTP error codes
        if ( $response_code < 200 || $response_code >= 300 ) {
            $error_message = $this->parse_api_error( $response_body, $response_code );
            $this->log_error( "API returned error code {$response_code}: {$error_message}" );

            return new WP_Error(
                'api_error',
                sprintf(
                    __( 'AI API returned an error (HTTP %d): %s', 'ai-editorial-agent' ),
                    $response_code,
                    $error_message
                )
            );
        }

        // Decode JSON response
        $decoded = json_decode( $response_body, true );

        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $this->log_error( 'Failed to decode API response: ' . json_last_error_msg() );

            return new WP_Error(
                'json_decode_error',
                __( 'Failed to decode AI API response.', 'ai-editorial-agent' )
            );
        }

        return $decoded;
    }

    /**
     * Parse API error response
     *
     * @param string $response_body Response body
     * @param int    $response_code HTTP response code
     * @return string Error message
     */
    private function parse_api_error( string $response_body, int $response_code ): string {
        $decoded = json_decode( $response_body, true );

        if ( isset( $decoded['error']['message'] ) ) {
            return $decoded['error']['message'];
        }

        // Default error messages based on status code
        return match ( $response_code ) {
            400     => 'Bad request - check your request format',
            401     => 'Unauthorized - check your API key',
            403     => 'Forbidden - API key may lack required permissions',
            429     => 'Rate limit exceeded - please try again later',
            500     => 'AI service internal error',
            503     => 'AI service temporarily unavailable',
            default => 'Unknown error occurred',
        };
    }

    /**
     * Parse and validate the API response to extract articles
     *
     * @param array $response Raw API response
     * @return array|WP_Error Array of articles or WP_Error
     */
    private function parse_api_response( array $response ): array|WP_Error {
        // Extract the content from Claude's response format
        if ( ! isset( $response['content'][0]['text'] ) ) {
            $this->log_error( 'Unexpected API response structure' );

            return new WP_Error(
                'invalid_response_structure',
                __( 'AI API returned an unexpected response format.', 'ai-editorial-agent' )
            );
        }

        $content_text = $response['content'][0]['text'];

        // Try to extract JSON from the response
        // The AI might wrap JSON in markdown code blocks
        $json_content = $this->extract_json_from_response( $content_text );

        if ( empty( $json_content ) ) {
            $this->log_error( 'Could not extract JSON from API response' );

            return new WP_Error(
                'json_extraction_failed',
                __( 'Could not extract article data from AI response.', 'ai-editorial-agent' )
            );
        }

        // Decode the article JSON
        $articles = json_decode( $json_content, true );

        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $this->log_error( 'Failed to decode article JSON: ' . json_last_error_msg() );

            return new WP_Error(
                'article_json_error',
                __( 'AI returned invalid article JSON format.', 'ai-editorial-agent' )
            );
        }

        // Validate article structure
        $validation_result = $this->validate_articles_structure( $articles );

        if ( is_wp_error( $validation_result ) ) {
            return $validation_result;
        }

        return $articles;
    }

    /**
     * Extract JSON content from response that might include markdown formatting
     *
     * @param string $content Response content
     * @return string Extracted JSON string
     */
    private function extract_json_from_response( string $content ): string {
        // First, try to find JSON within code blocks
        if ( preg_match( '/```(?:json)?\s*\n?([\s\S]*?)\n?```/', $content, $matches ) ) {
            return trim( $matches[1] );
        }

        // Try to find raw JSON (starts with { or [)
        $content = trim( $content );

        if ( str_starts_with( $content, '{' ) || str_starts_with( $content, '[' ) ) {
            return $content;
        }

        // Try to extract JSON object or array from the content
        if ( preg_match( '/(\{[\s\S]*\}|\[[\s\S]*\])/', $content, $matches ) ) {
            return $matches[1];
        }

        return '';
    }

    /**
     * Validate that articles have required structure
     *
     * @param mixed $articles Articles data to validate
     * @return true|WP_Error True if valid, WP_Error otherwise
     */
    private function validate_articles_structure( mixed $articles ): true|WP_Error {
        if ( ! is_array( $articles ) ) {
            return new WP_Error(
                'invalid_articles_format',
                __( 'Articles data must be an array.', 'ai-editorial-agent' )
            );
        }

        // Check if it's a single articles object with 'articles' key
        if ( isset( $articles['articles'] ) && is_array( $articles['articles'] ) ) {
            $articles = $articles['articles'];
        }

        $required_fields = [ 'title', 'content', 'category' ];

        foreach ( $articles as $index => $article ) {
            if ( ! is_array( $article ) ) {
                return new WP_Error(
                    'invalid_article_format',
                    sprintf(
                        __( 'Article at index %d is not properly formatted.', 'ai-editorial-agent' ),
                        $index
                    )
                );
            }

            foreach ( $required_fields as $field ) {
                if ( empty( $article[ $field ] ) ) {
                    return new WP_Error(
                        'missing_article_field',
                        sprintf(
                            __( 'Article at index %d is missing required field: %s', 'ai-editorial-agent' ),
                            $index,
                            $field
                        )
                    );
                }
            }
        }

        return true;
    }

    /**
     * Log debug message (only in debug mode)
     *
     * @param string $message Debug message
     */
    private function log_debug( string $message ): void {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( '[AI Editorial Agent DEBUG] ' . $message );
        }
    }

    /**
     * Log error message
     *
     * @param string $message Error message
     */
    private function log_error( string $message ): void {
        error_log( '[AI Editorial Agent ERROR] ' . $message );
    }

    /**
     * Update the API endpoint (for custom/self-hosted endpoints)
     *
     * @param string $endpoint New API endpoint URL
     */
    public function set_api_endpoint( string $endpoint ): void {
        $this->api_endpoint = esc_url_raw( $endpoint );
    }

    /**
     * Update the model to use
     *
     * @param string $model Model identifier
     */
    public function set_model( string $model ): void {
        $this->model = sanitize_text_field( $model );
    }
}
