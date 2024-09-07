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

{{% set sorted_licenses = config.shame_counts | dictsort(by='value') | reverse %}
{% for license, counts in sorted_licenses %}
{% if loop.index > 3 %}
{% break %}
{% endif %}
{{ loop.index }} {{ license }}: {{ counts | length }} unique offenses
{% endfor %}}

## Top Offenders: Frequency of Hard Words

{% for license, counts in sorted_licenses %}
{% if loop.index > 3 %}
{% break %}
{% endif %}
{{ loop.index }} {{ license }}: {{ counts | map(attribute='count') | sum }} total offenses

{% endfor %}

## Readability

{{% set sorted_licenses = config.shame_readability | dictsort(by='value') %}
{% for license, readability in sorted_licenses %}
{{ license }}: {{ readability }}
{% endfor %}}
