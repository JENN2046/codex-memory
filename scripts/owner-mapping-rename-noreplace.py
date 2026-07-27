#!/usr/bin/env python3
"""Atomically rename one child directory without replacing a target."""

import ctypes
import errno
import os
import stat
import sys


ROOT_FD = 3
RENAME_NOREPLACE = 1
EXIT_TARGET_EXISTS = 17
EXIT_USAGE = 64
EXIT_OPERATION_FAILED = 74
EXIT_PRIMITIVE_UNAVAILABLE = 78


def valid_entry_name(value: str) -> bool:
    if not value or len(value) > 80 or value in {".", ".."}:
        return False
    return "/" not in value and "\\" not in value and "\x00" not in value


def owner_only_directory(file_stat: os.stat_result) -> bool:
    return (
        stat.S_ISDIR(file_stat.st_mode)
        and file_stat.st_uid == os.getuid()
        and (file_stat.st_mode & 0o077) == 0
    )


def load_renameat2():
    try:
        root_stat = os.fstat(ROOT_FD)
    except OSError:
        return None
    if not owner_only_directory(root_stat):
        return None

    try:
        renameat2 = ctypes.CDLL(None, use_errno=True).renameat2
    except (AttributeError, OSError):
        return None
    renameat2.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    renameat2.restype = ctypes.c_int
    return renameat2


def main() -> int:
    renameat2 = load_renameat2()
    if renameat2 is None:
        return EXIT_PRIMITIVE_UNAVAILABLE
    if sys.argv[1:] == ["--probe"]:
        return 0
    if len(sys.argv) != 3:
        return EXIT_USAGE
    source_name, target_name = sys.argv[1:]
    if not valid_entry_name(source_name) or not valid_entry_name(target_name):
        return EXIT_USAGE

    try:
        source_stat = os.stat(
            source_name,
            dir_fd=ROOT_FD,
            follow_symlinks=False,
        )
    except OSError:
        return EXIT_OPERATION_FAILED
    if not owner_only_directory(source_stat):
        return EXIT_OPERATION_FAILED

    ctypes.set_errno(0)
    result = renameat2(
        ROOT_FD,
        os.fsencode(source_name),
        ROOT_FD,
        os.fsencode(target_name),
        RENAME_NOREPLACE,
    )
    if result == 0:
        return 0
    observed_errno = ctypes.get_errno()
    if observed_errno in {errno.EEXIST, errno.ENOTEMPTY}:
        return EXIT_TARGET_EXISTS
    return EXIT_OPERATION_FAILED


if __name__ == "__main__":
    raise SystemExit(main())
