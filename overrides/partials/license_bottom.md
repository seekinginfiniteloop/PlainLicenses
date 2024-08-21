
{% if reference_links -%}
{% for link in reference_links %}
[{{ link.reference_tag|trim }}]: {{ link.link_url|trim }} "{{ link.link_title|trim }}"
{% endfor %}
{% endif %}
