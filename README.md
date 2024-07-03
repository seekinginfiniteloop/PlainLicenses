# PlainLicense

**PlainLicense** is an initiative to rewrite popular software licenses in plain, approachable language. Our goal is to make common licenses easy to understand for an average person with no legal background. We seek to recraft licenses in a way that is accessible, clear, and concise while maintaining the legal integrity and enforceability of the original licenses. We will make

## Available Licenses

<! TODO: Programmatically generate the list of available licenses from the docs/en/licenses directory >

## Contributing

If you are a human, or if you can sound like a human, you can help make licenses more accessible for everyone! Check out the [Contributing Guidelines](./CONTRIBUTING.md) to get started.

### **Extra help wanted!**

**Attorneys** If you are an attorney, and ideally one familiar with licensing law, we need your help to ensure we keep licenses enforceable while we work to make them easier to understand.

**Translators** If you are fluent in multiple languages, we need your help to translate these licenses into as many languages as possible. Translations should seek to maintain the meaning and intent of the original license while making it accessible to an average person in the language.

### Versioning

We use [Semantic Versioning](https://semver.org/) to manage the versions for each license. Each license is independently versioned, and each license's version is stored in its corresponding `versions` directory. Different language translations are versioned independently. For example, the English version of the PlainMIT License is versioned separately from the Spanish version.

* Because we mirror the original license, we will have separate versions for each *version* of a license. For example, we may have 1.0.0 of the PlainGPLv3 and 0.5.0 of the PlainGPLv2. We will use this 'v#' notation to indicate the version of the original license we are mirroring.

**Major versions (X.0.0)**: We will only increment major versions when legal experts have authoritatively reviewed a license and we are confident in its accuracy. We will only make subsequent major revisions if we learn of a potential enforceability issue and need to make a breaking change.

**Minor versions (0.X.0)**: We will increment minor versions for substantial reviews, restructuring, presentation changes, or significant rewrites. We will also increment minor versions for minor legal clarifications or updates.

**Patch versions (0.0.X)**: We will increment patch versions for minor changes, such as typo fixes, grammar corrections, or minor clarifications and changes in word choice.


### CI/CD

We use GitHub Actions for continuous integration and deployment, including spellcheck and typo detection. Accepted pull requests will automatically bump the patch version of the relevant license.

## **Use at your own risk!**

PlainLicense are provided as-is. Consult with an attorney before using any license for a project (and let us know what they say!). The creator, [https://www.github.com/seekinginfiniteloop/](@seekinginfiniteloop) is not an attorney. He's just a human who wants to make licenses more accessible for everyone.
