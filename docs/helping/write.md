---
template: main.html
title: Writing Guidelines for Plain License
description: Learn how to write clearly and accessibly for Plain License, including licenses and site content.
---
# Plain Language Writing Guidelines

Plain License aims to make legal concepts accessible to everyone using plain language. We need your help. Consider every word you write and how it can be made clearer and more understandable. Here are some guidelines to help you write effectively for Plain License.

**Remember your goal: make your message clear and accessible for as wide an audience as possible.**

## Core Principles

- Use simple words and sentences.
- Capture ideas, not structure. Don't feel bound by the original format.
- Use active voice and an informal tone.
- Be consistent with word choice. Use the same term for a concept every time.
- Avoid specialized language. If you must use a technical term, explain it, or use a simpler term alongside it.
- Avoid jargon, idioms, and regional expressions. If you aren't sure if people will understand, rephrase it.
- Incorporate visual elements like tables, headers, and graphics and rich text formatting, like bold and italics, to enhance understanding.

## License Style Guidelines

We standardize the words we use for certain concepts in our licenses. Here are some examples:

Our Words | License Words
-----------|-------------
you        | licensee, recipient
we, authors | licensor, provider, owner, author, developer, contributor, creator
the work  | licensed work, software, creation, covered work, library, materials, creation, content

If a license talks about "contributors" as well as 'licensors' (or similar), we use 'contributors' when we talk about the people who contribute to the work and "authors" to talk about the people who license the work to others. Authors and contributors are often the same people, but the license may treat them differently.

## Detailed Guidelines

1.  **Use Simple Language**

    - Choose common, everyday words
    - Break long sentences into shorter ones
    - Explain complex ideas step-by-step
    - Test your writing for readability

2.  **Focus on Ideas, Not Structure**

    - Think about the core message you want to convey, and organize your writing around that
    - Don't feel bound by the original format
    - Group related information together

3.  **Use Active Voice and Informal Tone**

    - Write as if you're speaking to the reader
    - Avoid formal or stuffy language
    - Use "you" to address the reader directly. If you need to distinguish between different groups, a table can help. For example:

If you are a developer... | If you are a user...
---------------------------|-------------------
You can...                 | Please...
&nbsp;&nbsp;&nbsp;&nbsp;be awesome!             | &nbsp;&nbsp;&nbsp;&nbsp;read the instructions.

4.  **Be Consistent**

    - Use the same word for a concept every time
    - Avoid using words that need explanation or have multiple meanings
    - Include definitions if you use a term in a specific way
    - Don't define a word as meaning something other than what people expect

5.  **Avoid Specialized Language**

    - Explain technical terms if you must use them
    - Don't use legal jargon. If you must, explain it in plain language
    - Rephrase idioms or cultural references to be more universal

6.  **Structure for Readability**

    - Use headings and subheadings
    - Use bullet points to highlight key information and summarize
    - Include white space to break up text

7.  **Use Visual Elements and Rich Formatting**

    - Use tables to summarize and differentiate information
    - Add relevant graphics or icons to illustrate concepts
    - Use rich text formatting (bold, italics) to highlight key points
    - Create diagrams or flowcharts for complex processes or ideas
    - Use callout boxes for important notes or examples

8.  **Tell Your Message Visually**

    - Use consistent color coding for related information
    - Use visuals to break up long sections of text and draw attention to key points
    - Use consistent color coding for related information
    - If an image or graphic's meaning isn't clear, add a caption or explanation
    - Make sure visuals are accessible (e.g., include alt text for images)

9.  **Balance Text and Visuals**

    - Don't overload the document with too many visual elements
    - Ensure visuals complement the text, not replace it
    - Use visuals to break up long sections of text
    - If a visual doesn't add value, consider removing it

10.  **Test Your Writing**

    - Read your text aloud to check flow
    - Ask someone unfamiliar with the topic to read it
    - Use readability tools to assess complexity
    - Get feedback on the effectiveness of your visual elements

## Resources

Plain License uses [MKDocs][mkdocshome] to generate our site. We write all site content in [Markdown][mdown]. MKDocs allows a wide range of 'extensions' to enhance the content, and you should use these to make your writing more accessible. Currently, we think the following extensions are the most useful and they are enabled in our configuration:

{% for ext in config.markdown_extensions %}
    {% set extname = ext.split('.')|last|trim %}
    {% if config.extra.extensions.get(extname) %}
    {% set fullname = config.extra.extensions[extname].name|trim %}
    {% set exturl = config.extra.extensions[extname].url|trim %}
    {% set extdesc = config.extra.extensions[extname].description|trim %}
- [{{ fullname|trim }}]({{ exturl|trim }}): {{ extdesc|trim }}
{% endif %}
{% endfor %}

[mkdocshome]: https://www.mkdocs.org/ "MKDocs Home"
[mdown]: https://www.markdownguide.org/ "Markdown Guide"
