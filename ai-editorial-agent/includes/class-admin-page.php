<?php
/**
 * Admin Page Class
 *
 * Handles the WordPress admin interface for the AI Editorial Agent
 *
 * @package AI_Editorial_Agent
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class AI_Editorial_Admin_Page {

    /**
     * Nonce action name
     *
     * @var string
     */
    private string $nonce_action = 'ai_editorial_generate_articles';

    /**
     * Nonce field name
     *
     * @var string
     */
    private string $nonce_name = 'ai_editorial_nonce';

    /**
     * Settings nonce action
     *
     * @var string
     */
    private string $settings_nonce_action = 'ai_editorial_save_settings';

    /**
     * Constructor - register hooks
     */
    public function __construct() {
        add_action( 'admin_menu', [ $this, 'add_admin_menu' ] );
        add_action( 'admin_init', [ $this, 'handle_form_submission' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );
    }

    /**
     * Add admin menu page
     */
    public function add_admin_menu(): void {
        add_menu_page(
            __( 'AI Editorial Agent', 'ai-editorial-agent' ),       // Page title
            __( 'AI Editorial', 'ai-editorial-agent' ),              // Menu title
            'manage_options',                                         // Capability required
            'ai-editorial-agent',                                     // Menu slug
            [ $this, 'render_admin_page' ],                          // Callback function
            'dashicons-edit-page',                                   // Icon
            30                                                        // Position
        );

        // Add settings submenu
        add_submenu_page(
            'ai-editorial-agent',                                    // Parent slug
            __( 'Settings', 'ai-editorial-agent' ),                  // Page title
            __( 'Settings', 'ai-editorial-agent' ),                  // Menu title
            'manage_options',                                         // Capability
            'ai-editorial-settings',                                  // Menu slug
            [ $this, 'render_settings_page' ]                        // Callback
        );
    }

    /**
     * Enqueue admin CSS and JavaScript
     *
     * @param string $hook Current admin page hook
     */
    public function enqueue_admin_assets( string $hook ): void {
        // Only load on our plugin pages
        if ( ! in_array( $hook, [ 'toplevel_page_ai-editorial-agent', 'ai-editorial_page_ai-editorial-settings' ], true ) ) {
            return;
        }

        wp_enqueue_style(
            'ai-editorial-admin',
            AI_EDITORIAL_AGENT_PLUGIN_URL . 'assets/admin.css',
            [],
            AI_EDITORIAL_AGENT_VERSION
        );
    }

    /**
     * Handle form submissions
     */
    public function handle_form_submission(): void {
        // Handle article generation
        if ( isset( $_POST['ai_editorial_generate'] ) ) {
            $this->process_article_generation();
        }

        // Handle settings save
        if ( isset( $_POST['ai_editorial_save_settings'] ) ) {
            $this->process_settings_save();
        }
    }

    /**
     * Process article generation request
     */
    private function process_article_generation(): void {
        // Verify nonce
        if ( ! isset( $_POST[ $this->nonce_name ] ) ||
             ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ $this->nonce_name ] ) ), $this->nonce_action ) ) {
            $this->add_admin_notice( 'error', __( 'Security check failed. Please try again.', 'ai-editorial-agent' ) );
            return;
        }

        // Verify user capability
        if ( ! current_user_can( 'manage_options' ) ) {
            $this->add_admin_notice( 'error', __( 'You do not have permission to perform this action.', 'ai-editorial-agent' ) );
            return;
        }

        // Check if API key is configured
        if ( empty( get_option( 'ai_editorial_api_key' ) ) ) {
            $this->add_admin_notice(
                'error',
                sprintf(
                    __( 'API key is not configured. Please <a href="%s">add your API key</a> first.', 'ai-editorial-agent' ),
                    esc_url( admin_url( 'admin.php?page=ai-editorial-settings' ) )
                )
            );
            return;
        }

        // Get optional topic
        $topic = isset( $_POST['ai_editorial_topic'] )
            ? sanitize_text_field( wp_unslash( $_POST['ai_editorial_topic'] ) )
            : '';

        // Generate articles
        $api_handler = new AI_Editorial_API_Handler();
        $articles    = $api_handler->generate_articles( $topic );

        if ( is_wp_error( $articles ) ) {
            $this->add_admin_notice( 'error', $articles->get_error_message() );
            error_log( '[AI Editorial Agent] Generation failed: ' . $articles->get_error_message() );
            return;
        }

        // Create draft posts
        $post_creator = new AI_Editorial_Post_Creator();
        $results      = $post_creator->create_drafts( $articles );

        // Display results
        $this->display_generation_results( $results );
    }

    /**
     * Process settings save
     */
    private function process_settings_save(): void {
        // Verify nonce
        if ( ! isset( $_POST['ai_editorial_settings_nonce'] ) ||
             ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ai_editorial_settings_nonce'] ) ), $this->settings_nonce_action ) ) {
            $this->add_admin_notice( 'error', __( 'Security check failed. Please try again.', 'ai-editorial-agent' ) );
            return;
        }

        // Verify user capability
        if ( ! current_user_can( 'manage_options' ) ) {
            $this->add_admin_notice( 'error', __( 'You do not have permission to perform this action.', 'ai-editorial-agent' ) );
            return;
        }

        // Save API key
        if ( isset( $_POST['ai_editorial_api_key'] ) ) {
            $api_key = sanitize_text_field( wp_unslash( $_POST['ai_editorial_api_key'] ) );
            update_option( 'ai_editorial_api_key', $api_key, false ); // false = don't autoload
        }

        $this->add_admin_notice( 'success', __( 'Settings saved successfully.', 'ai-editorial-agent' ) );
    }

    /**
     * Display generation results as admin notices
     *
     * @param array $results Results from post creation
     */
    private function display_generation_results( array $results ): void {
        $success_count = count( $results['success'] );
        $error_count   = count( $results['errors'] );

        if ( $success_count > 0 ) {
            $message = sprintf(
                _n(
                    '%d draft article created successfully.',
                    '%d draft articles created successfully.',
                    $success_count,
                    'ai-editorial-agent'
                ),
                $success_count
            );

            // Add edit links
            $edit_links = [];
            foreach ( $results['success'] as $post ) {
                $edit_links[] = sprintf(
                    '<a href="%s">%s</a>',
                    esc_url( $post['edit_url'] ),
                    esc_html( $post['title'] )
                );
            }

            $message .= '<br><strong>' . __( 'Edit drafts:', 'ai-editorial-agent' ) . '</strong> ';
            $message .= implode( ' | ', $edit_links );

            $this->add_admin_notice( 'success', $message );
        }

        if ( $error_count > 0 ) {
            $error_messages = [];
            foreach ( $results['errors'] as $error ) {
                $error_messages[] = sprintf( '%s: %s', $error['title'], $error['message'] );
            }

            $this->add_admin_notice(
                'error',
                __( 'Some articles failed to create:', 'ai-editorial-agent' ) . '<br>' . implode( '<br>', $error_messages )
            );
        }
    }

    /**
     * Add admin notice that persists through redirect
     *
     * @param string $type    Notice type: success, error, warning, info
     * @param string $message Notice message (can contain safe HTML)
     */
    private function add_admin_notice( string $type, string $message ): void {
        $notices = get_transient( 'ai_editorial_admin_notices' ) ?: [];

        $notices[] = [
            'type'    => $type,
            'message' => $message,
        ];

        set_transient( 'ai_editorial_admin_notices', $notices, 60 );

        // Also add immediate notice for same-page display
        add_action( 'admin_notices', function () use ( $type, $message ) {
            $this->render_admin_notice( $type, $message );
        } );
    }

    /**
     * Render a single admin notice
     *
     * @param string $type    Notice type
     * @param string $message Notice message
     */
    private function render_admin_notice( string $type, string $message ): void {
        $allowed_html = [
            'a'      => [
                'href'   => [],
                'target' => [],
                'rel'    => [],
            ],
            'br'     => [],
            'strong' => [],
            'em'     => [],
        ];

        printf(
            '<div class="notice notice-%s is-dismissible"><p>%s</p></div>',
            esc_attr( $type ),
            wp_kses( $message, $allowed_html )
        );
    }

    /**
     * Display any stored admin notices and clear them
     */
    private function display_stored_notices(): void {
        $notices = get_transient( 'ai_editorial_admin_notices' );

        if ( ! empty( $notices ) ) {
            foreach ( $notices as $notice ) {
                $this->render_admin_notice( $notice['type'], $notice['message'] );
            }

            delete_transient( 'ai_editorial_admin_notices' );
        }
    }

    /**
     * Render the main admin page
     */
    public function render_admin_page(): void {
        // Security check
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'ai-editorial-agent' ) );
        }

        $this->display_stored_notices();
        $api_key_configured = ! empty( get_option( 'ai_editorial_api_key' ) );

        ?>
        <div class="wrap ai-editorial-wrap">
            <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

            <div class="ai-editorial-container">
                <div class="ai-editorial-main">
                    <div class="ai-editorial-card">
                        <h2><?php esc_html_e( 'Generate Articles', 'ai-editorial-agent' ); ?></h2>

                        <p class="description">
                            <?php esc_html_e( 'Click the button below to generate AI-written articles. The AI will create:', 'ai-editorial-agent' ); ?>
                        </p>

                        <ul class="ai-editorial-list">
                            <li><?php esc_html_e( '1 News article - timely, current events focused', 'ai-editorial-agent' ); ?></li>
                            <li><?php esc_html_e( '1 Evergreen article - timeless, always-relevant content', 'ai-editorial-agent' ); ?></li>
                        </ul>

                        <p class="description">
                            <?php esc_html_e( 'Articles will be saved as drafts for your review before publishing.', 'ai-editorial-agent' ); ?>
                        </p>

                        <?php if ( ! $api_key_configured ) : ?>
                            <div class="notice notice-warning inline">
                                <p>
                                    <?php
                                    printf(
                                        wp_kses(
                                            __( 'API key is not configured. <a href="%s">Configure it here</a> before generating articles.', 'ai-editorial-agent' ),
                                            [ 'a' => [ 'href' => [] ] ]
                                        ),
                                        esc_url( admin_url( 'admin.php?page=ai-editorial-settings' ) )
                                    );
                                    ?>
                                </p>
                            </div>
                        <?php endif; ?>

                        <form method="post" action="" class="ai-editorial-form">
                            <?php wp_nonce_field( $this->nonce_action, $this->nonce_name ); ?>

                            <div class="ai-editorial-field">
                                <label for="ai_editorial_topic">
                                    <?php esc_html_e( 'Topic Focus (optional)', 'ai-editorial-agent' ); ?>
                                </label>
                                <input
                                    type="text"
                                    id="ai_editorial_topic"
                                    name="ai_editorial_topic"
                                    class="regular-text"
                                    placeholder="<?php esc_attr_e( 'e.g., artificial intelligence, climate change, etc.', 'ai-editorial-agent' ); ?>"
                                />
                                <p class="description">
                                    <?php esc_html_e( 'Leave blank to let the AI choose relevant topics.', 'ai-editorial-agent' ); ?>
                                </p>
                            </div>

                            <p class="submit">
                                <button
                                    type="submit"
                                    name="ai_editorial_generate"
                                    class="button button-primary button-large"
                                    <?php disabled( ! $api_key_configured ); ?>
                                >
                                    <?php esc_html_e( 'Generate Articles', 'ai-editorial-agent' ); ?>
                                </button>
                            </p>
                        </form>
                    </div>
                </div>

                <div class="ai-editorial-sidebar">
                    <div class="ai-editorial-card">
                        <h3><?php esc_html_e( 'Recent AI Drafts', 'ai-editorial-agent' ); ?></h3>
                        <?php $this->render_recent_drafts(); ?>
                    </div>

                    <div class="ai-editorial-card">
                        <h3><?php esc_html_e( 'Quick Links', 'ai-editorial-agent' ); ?></h3>
                        <ul class="ai-editorial-links">
                            <li>
                                <a href="<?php echo esc_url( admin_url( 'edit.php?post_status=draft' ) ); ?>">
                                    <?php esc_html_e( 'View All Drafts', 'ai-editorial-agent' ); ?>
                                </a>
                            </li>
                            <li>
                                <a href="<?php echo esc_url( admin_url( 'admin.php?page=ai-editorial-settings' ) ); ?>">
                                    <?php esc_html_e( 'Plugin Settings', 'ai-editorial-agent' ); ?>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Render recent AI-generated drafts
     */
    private function render_recent_drafts(): void {
        $drafts = get_posts( [
            'post_type'      => 'post',
            'post_status'    => 'draft',
            'posts_per_page' => 5,
            'meta_key'       => '_ai_editorial_generated',
            'meta_value'     => '1',
            'orderby'        => 'date',
            'order'          => 'DESC',
        ] );

        if ( empty( $drafts ) ) {
            echo '<p class="description">' . esc_html__( 'No AI-generated drafts yet.', 'ai-editorial-agent' ) . '</p>';
            return;
        }

        echo '<ul class="ai-editorial-drafts-list">';

        foreach ( $drafts as $draft ) {
            printf(
                '<li><a href="%s">%s</a><br><small>%s</small></li>',
                esc_url( get_edit_post_link( $draft->ID ) ),
                esc_html( $draft->post_title ),
                esc_html( get_the_date( '', $draft ) )
            );
        }

        echo '</ul>';
    }

    /**
     * Render the settings page
     */
    public function render_settings_page(): void {
        // Security check
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'ai-editorial-agent' ) );
        }

        $this->display_stored_notices();
        $api_key = get_option( 'ai_editorial_api_key', '' );

        ?>
        <div class="wrap ai-editorial-wrap">
            <h1><?php esc_html_e( 'AI Editorial Agent Settings', 'ai-editorial-agent' ); ?></h1>

            <form method="post" action="" class="ai-editorial-settings-form">
                <?php wp_nonce_field( $this->settings_nonce_action, 'ai_editorial_settings_nonce' ); ?>

                <table class="form-table" role="presentation">
                    <tbody>
                        <tr>
                            <th scope="row">
                                <label for="ai_editorial_api_key">
                                    <?php esc_html_e( 'AI API Key', 'ai-editorial-agent' ); ?>
                                </label>
                            </th>
                            <td>
                                <input
                                    type="password"
                                    id="ai_editorial_api_key"
                                    name="ai_editorial_api_key"
                                    value="<?php echo esc_attr( $api_key ); ?>"
                                    class="regular-text"
                                    autocomplete="off"
                                />
                                <p class="description">
                                    <?php esc_html_e( 'Enter your Claude API key. This will be stored securely in the WordPress database.', 'ai-editorial-agent' ); ?>
                                </p>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <p class="submit">
                    <button type="submit" name="ai_editorial_save_settings" class="button button-primary">
                        <?php esc_html_e( 'Save Settings', 'ai-editorial-agent' ); ?>
                    </button>
                </p>
            </form>

            <hr />

            <h2><?php esc_html_e( 'Editorial Prompt', 'ai-editorial-agent' ); ?></h2>
            <p class="description">
                <?php
                printf(
                    esc_html__( 'The editorial prompt is stored in %s. Edit this file to customize the AI\'s writing instructions.', 'ai-editorial-agent' ),
                    '<code>prompts/editorial-prompt.php</code>'
                );
                ?>
            </p>
        </div>
        <?php
    }
}
