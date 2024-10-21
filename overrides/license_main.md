{%- if outro -%}
{{ outro | trim }}
{% endif %}

//// tab | reader :material-book-open-outline:
     attrs: { data-icon: "reader_link" }
     select: true

<div class="license-header">
<h1 class="license-title">{{ plain_name | trim }}</h1>
<div class="version-info">
{% if original_version %}
<p class="original-version">Original Version: {{ original_version | trim }}</p>
{% endif %}
<p class="plain-version">Plain Version: **{{ plain_version | trim }}**</p>
</div>
</div>

{{ reader_license_text | trim }}

/// admonition | {{ interpretation_title | trim }}
    type: note

{{ interpretation_text | trim }}
///
{% include "partials/license_disclaimer_block.md" %}
////
//// tab | markdown :octicons-markdown-24:
     attrs: { data-icon: "markdown_link" }

```markdown

# {{ plain_name | trim }}

{% if original_version -%}
Original Version: {{ original_version | trim }} | Plain Version: {{ plain_version | trim }}
{% else -%}
Plain Version: {{ plain_version | trim }}
{% endif %}

{{ markdown_license_text | trim | wordwrap(width=80, break_long_words=False) }}

### {{ interpretation_title | trim }}

{{ interpretation_text | trim | wordwrap(width=80, break_long_words=False) }}

```

{% include "partials/license_disclaimer_block.md" %}

////
//// tab | plaintext <span class="twemoji plaintext"></span>
     attrs: { data-icon: "plaintext_link" }

```plaintext

{{ plain_name | trim }}

{% if original_version -%}
Original Version: {{ original_version | trim }} | Plain Version: {{ plain_version | trim }}
{% else -%}
Plain Version: {{ plain_version | trim }}
{% endif %}
{{ plaintext_license_text  | trim | wordwrap(width=80, break_long_words=False) }}

NOTE: {{ interpretation_title | trim }}

{{ interpretation_text | trim | wordwrap(width=80, break_long_words=False) }}

```

{% include "partials/license_disclaimer_block.md" %}

////
//// tab | changelog :material-history:
     attrs: { data-icon: "changelog_link" }

{% if changelog -%}
{{ changelog | trim }}
{% else -%}

## such empty, much void :nounproject-doge:

{% endif %}
////
//// tab | official :material-license:
     attrs: { data-icon: "official_link" }

{{ official_license_text | trim }}
{% if not link_in_original %}
{{ official_link | trim }}
{% endif %}

////

{% if reference_links -%}
{% for link in reference_links %}
[{{ link.reference_tag | trim }}]: {{ link.link_url | trim }} "{{ link.link_title | trim }}"
{% endfor %}
{% endif %}
