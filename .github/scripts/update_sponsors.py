import os
import re

import requests
import yaml

DONATE_FILE = "docs/helping/donate.md"
GOAL = 5000
ENDPOINT = "https://api.github.com/graphql"
USERNAME = "seekinginfiniteloop"


def fetch_total_amount(token: str) -> int:
    """
    Fetch the total amount of sponsorships received by a user from the GitHub API.

    This function sends a GraphQL query to the GitHub API using the provided token to retrieve the total lifetime sponsorship values for a specified user. It returns the total amount in dollars by summing the amounts received in cents.

    Args:
        token (str): The authorization token used to access the GitHub API.

    Returns:
        int: The total amount of sponsorships received, in dollars.
    """

    url = "https://api.github.com/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    query = (
        """
    {
    user(login: """
        + f'"{USERNAME}"'
        + """) {
        lifetimeReceivedSponsorshipValues(first: 200) {
        edges {
            node {
            amountInCents
            formattedAmount
            sponsor {
                ... on User {
                login
                }
                ... on Organization {
                login
                }
            }
            }
        }
        }
    }
    }
    """
    )
    try:
        if response := requests.post(url, json={"query": query}, headers=headers):
            cents = sum(
                edge["node"]["amountInCents"]
                for edge in response.json()["data"]["user"][
                    "lifetimeReceivedSponsorshipValues"
                ]["edges"]
            )
            return cents // 100
        return 0
    except Exception as e:
        print(e)
        return 0


def update_front_matter(content: str, amount: int) -> str:
    """
    Update the front matter of a markdown document with a new funding progress amount.

    This function extracts the existing front matter from the provided content, updates the funding progress with the specified amount, and reconstructs the document with the modified front matter.

    Args:
        content (str): The original markdown content containing front matter.
        amount (int): The new funding progress amount to be updated in the front matter.

    Returns:
        str: The updated markdown content with the modified front matter.
    """

    if front_matter_match := re.match(
        r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL | re.MULTILINE
    ):
        front_matter = yaml.safe_load(front_matter_match[1])
        rest_of_document = content[front_matter_match.end() :]
    else:
        front_matter = {}
        rest_of_document = content

    front_matter["funding-progress"] = amount

    # Convert the updated front matter back to YAML
    updated_front_matter = yaml.dump(front_matter, default_flow_style=False)

    # Reconstruct the document
    return f"---\n{updated_front_matter}---\n{rest_of_document}"


def main() -> None:
    """
    Main function to update the sponsors' donation markdown file.

    This function retrieves the current total donation amount using a provided token, updates the markdown file with this information, and saves the changes.

    Args:
        None

    Returns:
        None
    """
    if token := os.getenv("GH_TOKEN"):
        total_amount = fetch_total_amount(token)

        with open("docs/donate.md", "r") as file:
            content = file.read()

        updated_content = update_front_matter(content, total_amount)

        with open("docs/donate.md", "w") as file:
            file.write(updated_content)


if __name__ == "__main__":
    main()
