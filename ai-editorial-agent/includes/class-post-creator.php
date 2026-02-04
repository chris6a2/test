<?php
/**
 * Post Creator Class
 *
 * Handles creation of WordPress draft posts from AI-generated content
 *
 * @package AI_Editorial_Agent
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class AI_Editorial_Post_Creator {

    /**
     * Create draft posts from AI-generated articles
     *
     * @param array $articles Array of article data
     * @return array Results with created post IDs or errors
     */
    public function create_drafts( array $articles ): array {
        $results = [
            'success' => [],
            'errors'  => [],
        ];

        // Handle nested articles array
        if ( isset( $articles['articles'] ) && is_array( $articles['articles'] ) ) {
            $articles = $articles['articles'];
        }

        foreach ( $articles as $index => $article ) {
            $result = $this->create_single_draft( $article );

            if ( is_wp_error( $result ) ) {
                $results['errors'][] = [
                    'index'   => $index,
                    'title'   => $article['title'] ?? 'Unknown',
                    'message' => $result->get_error_message(),
                ];

                $this->log_error( sprintf(
                    'Failed to create draft for article "%s": %s',
                    $article['title'] ?? 'Unknown',
                    $result->get_error_message()
                ) );
            } else {
                $results['success'][] = [
                    'post_id'  => $result,
                    'title'    => $article['title'],
                    'edit_url' => get_edit_post_link( $result, 'raw' ),
                ];

                $this->log_debug( sprintf(
                    'Created draft post ID %d: "%s"',
                    $result,
                    $article['title']
                ) );
            }
        }

        return $results;
    }

    /**
     * Create a single draft post from article data
     *
     * @param array $article Article data with title, content, category, etc.
     * @return int|WP_Error Post ID on success, WP_Error on failure
     */
    private function create_single_draft( array $article ): int|WP_Error {
        // Validate required fields
        if ( empty( $article['title'] ) || empty( $article['content'] ) ) {
            return new WP_Error(
                'missing_required_fields',
                __( 'Article is missing title or content.', 'ai-editorial-agent' )
            );
        }

        // Prepare post content with sources appended
        $post_content = $this->prepare_post_content( $article );

        // Prepare post data
        $post_data = [
            'post_title'   => $this->sanitize_title( $article['title'] ),
            'post_content' => $post_content,
            'post_status'  => 'draft', // Always draft - never auto-publish
            'post_type'    => 'post',
            'post_author'  => get_current_user_id(),
            'meta_input'   => [
                '_ai_editorial_generated' => true,
                '_ai_editorial_timestamp' => current_time( 'mysql' ),
            ],
        ];

        // Add post excerpt/subheading if provided
        if ( ! empty( $article['subheading'] ) ) {
            $post_data['post_excerpt'] = wp_kses_post( $article['subheading'] );
        }

        // Insert the post
        $post_id = wp_insert_post( $post_data, true );

        if ( is_wp_error( $post_id ) ) {
            return $post_id;
        }

        // Assign category
        $category_result = $this->assign_category( $post_id, $article['category'] );

        if ( is_wp_error( $category_result ) ) {
            $this->log_error( sprintf(
                'Failed to assign category to post %d: %s',
                $post_id,
                $category_result->get_error_message()
            ) );
            // Don't fail the whole operation - post is created, just category assignment failed
        }

        // Add tags if provided
        if ( ! empty( $article['tags'] ) && is_array( $article['tags'] ) ) {
            $this->assign_tags( $post_id, $article['tags'] );
        }

        // Store sources as post meta for reference
        if ( ! empty( $article['sources'] ) ) {
            update_post_meta( $post_id, '_ai_editorial_sources', $article['sources'] );
        }

        return $post_id;
    }

    /**
     * Prepare post content with sources appended
     *
     * @param array $article Article data
     * @return string Formatted post content
     */
    private function prepare_post_content( array $article ): string {
        // Start with the main content
        $content = wp_kses_post( $article['content'] );

        // Append sources section if sources are provided
        if ( ! empty( $article['sources'] ) ) {
            $sources_html = $this->format_sources_section( $article['sources'] );
            $content     .= "\n\n" . $sources_html;
        }

        return $content;
    }

    /**
     * Format sources into an HTML section
     *
     * @param mixed $sources Sources data (array or string)
     * @return string Formatted HTML sources section
     */
    private function format_sources_section( mixed $sources ): string {
        $html  = "<!-- wp:heading {\"level\":3} -->\n";
        $html .= '<h3 class="wp-block-heading">' . esc_html__( 'Sources', 'ai-editorial-agent' ) . "</h3>\n";
        $html .= "<!-- /wp:heading -->\n\n";

        if ( is_array( $sources ) ) {
            $html .= "<!-- wp:list -->\n<ul class=\"wp-block-list\">\n";

            foreach ( $sources as $source ) {
                $html .= $this->format_single_source( $source );
            }

            $html .= "</ul>\n<!-- /wp:list -->";
        } else {
            // If sources is a string, wrap it in a paragraph
            $html .= "<!-- wp:paragraph -->\n";
            $html .= '<p>' . wp_kses_post( $sources ) . "</p>\n";
            $html .= "<!-- /wp:paragraph -->";
        }

        return $html;
    }

    /**
     * Format a single source item
     *
     * @param mixed $source Source data
     * @return string Formatted list item HTML
     */
    private function format_single_source( mixed $source ): string {
        if ( is_array( $source ) ) {
            // Source is an array with possible title/url/description
            $title       = $source['title'] ?? $source['name'] ?? '';
            $url         = $source['url'] ?? $source['link'] ?? '';
            $description = $source['description'] ?? '';

            if ( ! empty( $url ) && ! empty( $title ) ) {
                $link_html = '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( $title ) . '</a>';

                if ( ! empty( $description ) ) {
                    return '<li>' . $link_html . ' - ' . esc_html( $description ) . "</li>\n";
                }

                return '<li>' . $link_html . "</li>\n";
            } elseif ( ! empty( $title ) ) {
                return '<li>' . esc_html( $title ) . "</li>\n";
            } elseif ( ! empty( $url ) ) {
                return '<li><a href="' . esc_url( $url ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( $url ) . "</a></li>\n";
            }
        }

        // Source is a simple string
        if ( is_string( $source ) ) {
            // Check if it's a URL
            if ( filter_var( $source, FILTER_VALIDATE_URL ) ) {
                return '<li><a href="' . esc_url( $source ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( $source ) . "</a></li>\n";
            }

            return '<li>' . esc_html( $source ) . "</li>\n";
        }

        return '';
    }

    /**
     * Sanitize article title
     *
     * @param string $title Raw title
     * @return string Sanitized title
     */
    private function sanitize_title( string $title ): string {
        // Remove any HTML tags
        $title = wp_strip_all_tags( $title );

        // Decode HTML entities
        $title = html_entity_decode( $title, ENT_QUOTES, 'UTF-8' );

        // Trim whitespace
        $title = trim( $title );

        // Limit length
        if ( strlen( $title ) > 200 ) {
            $title = substr( $title, 0, 197 ) . '...';
        }

        return $title;
    }

    /**
     * Assign category to post
     *
     * @param int    $post_id       Post ID
     * @param string $category_name Category name
     * @return true|WP_Error True on success, WP_Error on failure
     */
    private function assign_category( int $post_id, string $category_name ): true|WP_Error {
        $category_name = sanitize_text_field( $category_name );

        // Try to find existing category
        $term = term_exists( $category_name, 'category' );

        if ( ! $term ) {
            // Create the category if it doesn't exist
            $term = wp_insert_term( $category_name, 'category', [
                'description' => sprintf( 'AI-generated %s articles', strtolower( $category_name ) ),
                'slug'        => sanitize_title( $category_name ),
            ] );

            if ( is_wp_error( $term ) ) {
                return $term;
            }
        }

        $term_id = is_array( $term ) ? $term['term_id'] : $term;

        // Assign category to post
        $result = wp_set_post_categories( $post_id, [ (int) $term_id ], false );

        if ( false === $result ) {
            return new WP_Error(
                'category_assignment_failed',
                __( 'Failed to assign category to post.', 'ai-editorial-agent' )
            );
        }

        return true;
    }

    /**
     * Assign tags to post
     *
     * @param int   $post_id Post ID
     * @param array $tags    Array of tag names
     */
    private function assign_tags( int $post_id, array $tags ): void {
        $sanitized_tags = array_map( 'sanitize_text_field', $tags );
        $sanitized_tags = array_filter( $sanitized_tags ); // Remove empty values

        if ( ! empty( $sanitized_tags ) ) {
            wp_set_post_tags( $post_id, $sanitized_tags, false );
        }
    }

    /**
     * Log debug message
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
}
