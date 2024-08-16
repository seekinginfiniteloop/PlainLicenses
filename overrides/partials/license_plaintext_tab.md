//// tab | plaintext

```plaintext

{{ page.meta.plain_name|trim }}

{% if page.meta.original_version -%}
Original Version: {{ page.meta.original_version|trim }} | Plain Version: {{ page.meta.plain_version|trim }}
{% else -%}
Plain Version: {{ page.meta.plain_version|trim }}
{% endif %}
{{ page.meta.plaintext_license_text|trim|wordwrap(width=80, break_long_words=False) }}

NOTE: {{ page.meta.interpretation_title|trim }}

{{  page.meta.interpretation_text|trim|wordwrap(width=80, break_long_words=False) }}

```

<p class="license-divider"></p>
{% include "partials/license_disclaimer_block.md" %}
////
