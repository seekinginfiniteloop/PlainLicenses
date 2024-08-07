---
title: Plain {{LICENSE}}
description: The Plain {{LICENSE}} -- the {{LICENSE}}, but now in plain language for everyone to understand. Real terms for real people.
spdx_id: {{SPDX identifier for the original license, if applicable}}
original_name: {{Full name of the original license}}
original_url: https://{{licenseurl}} # URL to the original license text, link to official site if possible
original_version: {{Version number of the original license}}
category: {{Category of the original license; one of: public-domain, permissive, copyleft, source-available, proprietary}}
plain_name: Plain {{LICENSE}}
plain_url: /licenses/{{category}}/{{spdx_id}}/ # URL to the plain language version of the license)
plain_version: {{Version number of the plain language license}}
license_description: {{Description of the original license and its defining characteristics.}}

how: {{Instructions for how to apply the license to your work.}}

note: {{Any additional notes or recommendations for using the license.}}
# We use choosealicense.com's tagging system; we haven't implemented this yet, but we will in the future
# https://github.com/github/choosealicense.com#license-metadata
permissions: # our version of the tag for mkdocs is next to the choosealicense.com tag; not all tags are used for the mkdocs version
  - distribution # can-share
  - commercial-use # commercial-OK
  - modifications # can-change
  - patent-use
  - private-use

conditions:
  - disclose-source # share-source
  - document-changes # describe-changes
  - include-copyright # give credit
  - include-copyright # give credit
  - network-use-disclose
  - same-license # share-alike
  - same-license--file # share-alike
  - same-license--library # share-alike
  -

limitations: # we don't use this for mkdocs tags since most licenses have or imply these limitations
  - liability
  - patent-use
  - trademark-use
  - warranty

tags: # As applicable:
  - can-share
  - can-change
  - commercial-OK
  - share-alike
  - give-credit
  - describe-changes
  - share-source

hide: # don't change this
  - toc

---
<!-- **NOTE**: Our hooks will autogenerate the other tabs.
If you have code blocks in these sections, use 'plaintext' as the type -->
//// tab | reader

# Plain {{LICENSE}}

Original Version: n/a
Plain Version: 0.0.0

{{license_description}}

### Headers usually third level, but can be any level; second level headers have a line break

////
//// tab | official version

# {{LICENSE}}

{{Original license text}}

////
