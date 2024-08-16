//// tab | reader

<div class="license-header">
<h1 class="license-title">{{ page.meta.plain_name|trim }}</h1>
<div class="version-info">
{% if page.meta.original_version %}
<p class=original_version>Original Version: {{ page.meta.original_version|trim }}</p>
<p class=plain_version>Plain Version: <strong>{{ page.meta.plain_version|trim }}</strong></p>
{% else %}
Plain Version: {{ page.meta.plain_version|trim }}
{% endif %}
</div>
</div>
{{ page.meta.reader_license_text|trim }}
/// admonition | {{ page.meta.interpretation_title|trim }}
    type: note

{{  interpretation_text|trim }}
///
<p class="license-divider"></p>
{% include "partials/license_disclaimer_block.md" %}
////
