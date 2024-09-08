---
title: Donate to Plain License
description: Support Plain License's mission to make licensing more accessible and understandable for everyone.
funding_progress: 0
funding_goal: 5000
---
# Support Plain License

Your support helps us make licensing more accessible and understandable for everyone. Here's how you can contribute to our mission:

## Financial Contributions

### GitHub Sponsors

The easiest way to donate to Plain License is through [GitHub Sponsors][sponsors]. Your donations help cover our operational costs and support our ongoing development efforts.

<iframe src="https://github.com/sponsors/seekinginfiniteloop/button" title="Sponsor seekinginfiniteloop" height="32" width="114" style="border: 0; border-radius: 6px;"></iframe>

Every contribution, no matter the size, makes a difference. Thank you for your support!

## Our Current Fundraising Goal

Our immediate goal is to raise **$5,000** or get equivalent services to cover the costs associated with:

1. Legal fees for {% raw %}501&lpar;c&rpar;(3){% endraw %} application
2. Initial administrative and filing fees
3. Basic operational setup costs

Once we are an official non-profit, we will be able to do a lot more. Your contributions directly support our goal and help us create a sustainable foundation for Plain License's future.

## Progress Tracker

{% set progress = page.meta.funding_progress|trim|int %}
{% set goal = page.meta.funding_goal|trim|int %}
{% set percentage = percentage|default(0) %}
{% set percentage = (progress / goal * 100) %}
{% set percentage = percentage|round(2)|default|string + "%" %}

<div class="candystripe" markdown>
[={{ percentage }} "{{ percentage }}"]
</div>
## Volunteer Expertise Needed

In addition to financial support, we're seeking volunteers with experience in chartering 501&lpar;c&rpar;(3) organizations. If you have knowledge in this area and are willing to contribute your time and expertise, we'd love to hear from you!

### How You Can Help

- Provide guidance on the application process
- Review our documentation
- Offer insights on best practices for nonprofit governance
- Assist with structuring our organization for {% raw %}501&lpar;c&rpar;(3){% endraw %} eligibility

If you're interested in volunteering your expertise, please [email us][contact] with the subject line "{% raw %}501&lpar;c&rpar;(3){% endraw %} Chartering Assistance". In your email, please briefly describe your experience with nonprofit organizations and how you believe you can help.

## Other Ways to Support

Remember, financial contributions aren't the only way to support Plain License. You can also contribute by:

- [Contributing to our codebase][code]
- [Helping with translations][translate]
- [Providing legal expertise][legal]
- Spreading the word about Plain License in your network

Every form of support helps us move closer to our goal of making licensing simple and accessible for everyone.

Thank you for considering a donation to Plain License. Your support makes our work possible!

[sponsors]: https://github.com/sponsors/seekinginfiniteloop "Sponsor seekinginfiniteloop for Plain License"
[contact]: mailto:adam@plainlicense.org "Email Adam for more information"
[code]: code.md "Developer Contributions"
[translate]: translate.md "Translation Contributions"
[legal]: legal.md "Legal Contributions"
