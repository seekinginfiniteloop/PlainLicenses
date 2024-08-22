//// tab | reader :material-book-open-outline:
    attrs: { data-icon: "reader_link"}

<div class="license-header">
<h1 class="license-title">{{ plain_name|trim }}</h1>
<div class="version-info">
{% if original_version %}
<p class=original_version>Original Version: {{ original_version|trim }}</p>
<p class=plain_version>Plain Version: <strong>{{ plain_version|trim }}</strong></p>
{% else %}
Plain Version: {{ plain_version|trim }}
{% endif %}
</div>
</div>
{{ reader_license_text|trim }}

/// admonition | {{ interpretation_title|trim }}
    type: note

{{  interpretation_text|trim|wordwrap(width=80, break_long_words=False) }}
///
<p class="license-divider"></p>
{% include "partials/license_disclaimer_block.md" %}
////
