---
title: Hall of Shame
description: A comparison of frequency and usage of complex words in the original versions of licenses that we recrafted in plain language.
draft: true
---

# Hall of Shame

The **Hall of Shame** shows:

- Hard words and phrases from old licenses
- How often these words are used
- Better, simpler words to use instead
- It only has licenses we recrafted

## Why it matters

- It shows how much work we need to do to make licenses easier to read
- It encourages people who write licenses to use simpler words

## How it works

We provide different comparisons:

- The number of unique hard words in the original license
- The number of times these words are used
- The readability of the original license on the [Gunning fog index](https://en.wikipedia.org/wiki/Gunning_fog_index).

## Top Offenders: Unique Hard Words

{% if config.shame_counts %}
{% set sorted_licenses = config.shame_counts | dictsort(by='value') | reverse %}
{% for license, counts in sorted_licenses %}
{% if loop.index <4 %}
{{ loop.index }} {{ license }}: {{ counts | length }} unique offenses
{% endif %}
{% endfor %}
{% endif %}

## Top Offenders: Frequency of Hard Words

{% if config.shame_counts %}
{% for license, counts in sorted_licenses %}
{% if loop.index < 4 %}

{{ loop.index }} {{ license }}: {{ counts | map(attribute='count') | sum }} total offenses
{% endif %}
{% endfor %}
{% endif %}

## Readability

{% if config.shame_readability %}
{% set sorted_licenses = config.shame_readability | dictsort(by='value') %}
{% for license, readability in sorted_licenses %}
{{ license }}: {{ readability }}
{% endfor %}
{% endif %}
