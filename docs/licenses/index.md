---
title: Plain Licenses
description: Our plain licenses are easy to understand and use. We divide our licenses into public domain (dedications), permissive, copyleft, source-available, and proprietary.
---

# Plain Licenses

Welcome to our plain license hub! We divide our licenses into public domain (dedications), permissive, copyleft, source-available, and proprietary.

| Open Source                                                                  | Non-Free[^1]                                                          |
| :--------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| [public domain][public-domain]{ .md-button }                        | [source-available][source-available]{ .md-button }           |
| [permissive][permissive]{ .md-button }                              | [proprietary][proprietary]{ .md-button }                     |
| [copyleft][copyleft]{ .md-button }                                  |                                                                       |

[^1]: Some people call these licenses "closed source," but we don't think that's a accurate. The source code is openly available, and you can use it in many cases, but your use comes with restrictions. For example, licenses with restrictions against using a work commercially fall into this category because they don't meet the Open Source Initiative's definition of "open source."

/// define

### [:nounproject-public-domain: public domain dedications][public-domain]

-   The opposite of licenses. When you dedicate your work to the public domain, you give up all rights to it forever. This means anyone can do anything with the work. However, not all places let you dedicate to the public domain, so we provide a backup permissive license in our public domain dedications. (1)
{ .annotate }

    1. It's not just us. Most public domain dedications come with a backup license.

///

/// define

### [:nounproject-copyright: permissive licenses][permissive]

- Permissive licenses allow you to do almost anything with the work, but you have to give credit to the original author. They are the most popular licenses for open source software.

///
//// define

### [:nounproject-copyleft: copyleft licenses][copyleft]

- Copyleft licenses are both open source and restrictive. They allow you to do almost anything with the work, but you have to share any changes you make to the work. **Copyleft licenses are a great way to share a work while ensuring that it stays open source.**. There are two main types of copyleft licenses: weak and strong.

/// define

- **Weak copyleft** licenses only require you to share the changes you make to the original work. They don't require you to share the rest of your work. The Mozilla Public License 2.0 is a weak copyleft license.

///

/// define

-   **Strong copyleft** licenses require you to share the entire work, including any changes you make to the original work. Because of this, strong copyleft licenses are sometimes called "viral" licenses because they can "infect" works that use components from a copyleft protected work, requiring you to license the new work under the same terms. The GNU General Public License (GPL) 3.0 is a strong copyleft license. If you use strong copyleft code in your work, even if is part of a much larger work, you must license the entire work under the same terms as the original work.(1)
{ .annotate }

    1. You can distribute strong copyleft licensed works alongside other works under different licenses, but you can't combine them in any way. For example, you can use a GPL licensed library in a larger work that is licensed differently, as long as you don't change the library or combine it with the larger work.

///

/// admonition | Do I need to license my new work under the same terms as the original work?
    type: question
**Probably. Copyleft licenses usually require you to license your new work under the same terms as the original work.** This means you have to share your work with the same permissions as the original work. If you don't want to do that, you should use a permissive license instead.

With all licenses, you usually have to apply the same terms to follow-on works, but many permissive licenses can be relicensed under similar terms. Copyleft licenses usually require you to license your work under the same terms as the original work. The Mozilla Public License (MPL) 2.0 allows for larger works to be licensed under different terms, as long as the parts covered by the MPL keep the same terms as the MPL.

///

////

/// define

### [:nounproject-no-commercial: source-available licenses][source-available]

- Source-available licenses can cover a wide range of permissions. They are not considered open source because they restrict what you can do with the work. They are sometimes called "shared source" licenses. Some source available licenses are free to use, but others require payment or have other restrictions. They are different from proprietary licenses because they allow you to see the source code, but they are not as open as open source licenses.

///
/// define

### [:nounproject-proprietary: proprietary licenses][proprietary]

- Proprietary licenses fully restrict what you can do with the work, keeping all rights with the original author. They are the most common licenses for commercial software and are sometimes called "closed source" licenses. We distinguish fully proprietary licenses from source-available licenses because source-available licenses allow you to see the source code, but proprietary licenses do not.

///

[copyleft]: copyleft/index.md "Plain License Copyleft Licenses"
[permissive]: permissive/index.md "Plain License Permissive Licenses"
[proprietary]: proprietary/index.md "Plain License Proprietary Licenses"
[public-domain]: public-domain/index.md "Plain License Public Domain Dedications"
[source-available]: source-available/index.md "Plain License Source-Available Licenses"
