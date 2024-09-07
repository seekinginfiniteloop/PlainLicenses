---
title: Contributing Translations to Plain License
description: Learn how to contribute translations to Plain License, including licenses and site content.
---
# Contributing Translations to Plain License

We're excited about the prospect of making Plain License accessible in multiple languages! While we don't currently have a system in place for multi-language support, we welcome contributions and ideas from both developers and translators.

## For Developers: Help Us Implement Multi-Language Support

**We're seeking proposals for implementing multi-language support across Plain License.** This includes:

1. Individual licenses
2. MkDocs i18n features
3. General site content

If you have experience with internationalization (i18n) and localization (l10n) in web projects, especially those using MkDocs, we'd love to hear your ideas!

### Give Us Your Ideas

1.  Check our existing feature request issues to see if your idea has already been proposed:
   - [Issue #8: Implement multi-language support for licenses][i8]
   - [Issue #9:  Integrate Material for MKDocs Internationalization][i9]
   - [Issue #10: Add Multilanguage Support for Site Content][i10]

2.  If your idea isn't already there, feel free to open a new issue detailing your proposal. Please include:
   - A clear title describing your proposal
   - A detailed description of how your solution would work
   - Any potential challenges or considerations
   - Your experience with similar implementations, if applicable

3. Tag your issue with the "enhancement" and "i18n" labels.

We'll review all proposals and discuss them in the community to determine the best path forward.

## For Translators: Help Us Prepare for Multi-Language Support

Even though we don't have a system in place yet, your translations are valuable and will help us prepare for multi-language support!

### Contributing License Translations

To contribute a license translation:

1.  Follow the instructions in our [license recrafting guidelines][crafting].
2.  When naming your file, use the format `index_XX.md`, where `XX` is the language code.

   - For example, a Spanish translation would be `index_es.md`.
   - We use the [ISO 639-1 two-letter language codes][iso] where possible.
   - For languages or dialects that require more specificity, use the appropriate [IETF language tag][ietf]. For example, `index_zh-Hans.md` for Simplified Chinese.

### Contributing Other Translations

For other site content or documentation:

1. Create a new file with the same name as the original, but add the language code as a suffix before the file extension.
   - For example, `about.md` would become `about_es.md` for Spanish.
2. Translate the content, maintaining the original Markdown formatting.
3. Submit your translation as described in our general [recrafting guidelines][crafting].

## Next Steps

We're working on implementing a robust multi-language support system. In the meantime, your contributions will be stored and prepared for integration once we have a system in place. As we get contributions, we'll keep you updated on our progress, and look for ways to integrate them into the site.

Thank you for your patience and for helping make Plain License accessible to a global audience!

[iso]: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes "ISO 639-1 Language Codes"
[ietf]: https://en.wikipedia.org/wiki/IETF_language_tag "IETF Language Tag"
[crafting]: crafting.md "License Crafting Guide"
[i8]: {{ config.repo_url }}/issues/8 "Issue #8: Implement multi-language support for licenses"
[i9]: {{ config.repo_url }}/issues/9 "Issue #9: Integrate Material for MKDocs Internationalization"
[i10]: {{ config.repo_url }}/issues/10 "Issue #10: Add Multilanguage Support for Site Content"
