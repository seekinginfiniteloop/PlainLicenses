//// tab | changelog :material-history:
    attrs: { data-icon: "changelog_link"}

{% if changelog -%}
{{ changelog|trim }}
{% else -%}

## such empty, much void :nounproject-doge:

{% endif %}
////
