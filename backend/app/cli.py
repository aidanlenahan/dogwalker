"""Account admin. There is no public sign-up (PRD §24).

uv run python -m app.cli create-user <username> --display-name "Name"
uv run python -m app.cli set-password <username>
"""

import argparse
import getpass
import re
import sys

from sqlalchemy import delete, select

from app.db import get_sessionmaker
from app.models import AuthSession, User
from app.security import hash_password

USERNAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,31}$")
MIN_PASSWORD_LENGTH = 10


def _prompt_password() -> str:
    while True:
        password = getpass.getpass("Password: ")
        if len(password) < MIN_PASSWORD_LENGTH:
            print(f"Use at least {MIN_PASSWORD_LENGTH} characters.", file=sys.stderr)
            continue
        if getpass.getpass("Confirm password: ") != password:
            print("Passwords don't match.", file=sys.stderr)
            continue
        return password


def create_user(username: str, display_name: str) -> int:
    username = username.lower()
    if not USERNAME_RE.fullmatch(username):
        print("Username must be 2-32 chars: a-z, 0-9, _ or -.", file=sys.stderr)
        return 1
    with get_sessionmaker()() as db:
        if db.scalar(select(User).where(User.username == username)):
            print(f"User {username!r} already exists.", file=sys.stderr)
            return 1
        db.add(
            User(
                username=username,
                display_name=display_name,
                password_hash=hash_password(_prompt_password()),
            )
        )
        db.commit()
    print(f"Created user {username!r}.")
    return 0


def set_password(username: str) -> int:
    with get_sessionmaker()() as db:
        user = db.scalar(select(User).where(User.username == username.lower()))
        if user is None:
            print(f"No user {username!r}.", file=sys.stderr)
            return 1
        user.password_hash = hash_password(_prompt_password())
        # Sign out everywhere.
        db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
        db.commit()
    print(f"Password updated for {username!r}; existing sessions signed out.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("create-user", help="Create a walker account")
    p.add_argument("username")
    p.add_argument("--display-name", required=True)

    p = sub.add_parser("set-password", help="Reset a user's password and sign them out")
    p.add_argument("username")

    args = parser.parse_args(argv)
    if args.command == "create-user":
        return create_user(args.username, args.display_name)
    return set_password(args.username)


if __name__ == "__main__":
    sys.exit(main())
