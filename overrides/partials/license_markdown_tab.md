//// tab | markdown :octicons-markdown-24:
    attrs: { data-icon: "markdown_link" }

```markdown

# {{ plain_name|trim }}

{% if original_version -%}
Original Version: {{ original_version|trim }} | Plain Version: {{ plain_version|trim }}
{% else -%}
Plain Version: {{ plain_version|trim }}
{% endif %}

{{ markdown_license_text|trim|wordwrap(width=80, break_long_words=False) }}

### {{ interpretation_title|trim }}

{{  interpretation_text|trim|wordwrap(width=80, break_long_words=False) }}

```

<p class="license-divider"></p>
{% include "partials/license_disclaimer_block.md" %}
////
