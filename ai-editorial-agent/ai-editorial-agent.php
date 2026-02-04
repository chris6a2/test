<?php
/**
 * Plugin Name: AI Editorial Agent
 * Plugin URI: https://example.com/ai-editorial-agent
 * Description: AI-powered editorial agent that researches, writes, fact-checks, and creates draft articles on demand.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Author: Your Name
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ai-editorial-agent
 */

// Prevent direct file access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Plugin constants
define( 'AI_EDITORIAL_AGENT_VERSION', '1.0.0' );
define( 'AI_EDITORIAL_AGENT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'AI_EDITORIAL_AGENT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Main plugin class using singleton pattern
 */
final class AI_Editorial_Agent {

    /**
     * Single instance of the class
     *
     * @var AI_Editorial_Agent|null
     */
    private static ?AI_Editorial_Agent $instance = null;

    /**
     * Get the singleton instance
     *
     * @return AI_Editorial_Agent
     */
    public static function get_instance(): AI_Editorial_Agent {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Private constructor to prevent direct instantiation
     */
    private function __construct() {
        $this->load_dependencies();
        $this->init_hooks();
    }

    /**
     * Load required class files
     */
    private function load_dependencies(): void {
        require_once AI_EDITORIAL_AGENT_PLUGIN_DIR . 'includes/class-ai-api-handler.php';
        require_once AI_EDITORIAL_AGENT_PLUGIN_DIR . 'includes/class-post-creator.php';
        require_once AI_EDITORIAL_AGENT_PLUGIN_DIR . 'includes/class-admin-page.php';
    }

    /**
     * Initialize WordPress hooks
     */
    private function init_hooks(): void {
        // Initialize admin page
        if ( is_admin() ) {
            new AI_Editorial_Admin_Page();
        }

        // Plugin activation hook
        register_activation_hook( __FILE__, [ $this, 'activate' ] );

        // Plugin deactivation hook
        register_deactivation_hook( __FILE__, [ $this, 'deactivate' ] );
    }

    /**
     * Plugin activation tasks
     */
    public function activate(): void {
        // Create default categories if they don't exist
        $this->create_default_categories();

        // Set default options
        if ( false === get_option( 'ai_editorial_api_key' ) ) {
            add_option( 'ai_editorial_api_key', '', '', 'no' ); // 'no' = don't autoload for security
        }

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation tasks
     */
    public function deactivate(): void {
        flush_rewrite_rules();
    }

    /**
     * Create default article categories
     */
    private function create_default_categories(): void {
        $categories = [ 'News', 'Evergreen' ];

        foreach ( $categories as $category_name ) {
            if ( ! term_exists( $category_name, 'category' ) ) {
                wp_insert_term( $category_name, 'category', [
                    'description' => sprintf( 'AI-generated %s articles', strtolower( $category_name ) ),
                    'slug'        => sanitize_title( $category_name ),
                ] );
            }
        }
    }
}

// Initialize the plugin
AI_Editorial_Agent::get_instance();
