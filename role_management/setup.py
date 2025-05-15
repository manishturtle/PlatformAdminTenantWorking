from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="role_management",
    version="0.1.3",
    author="Manish Kumar",
    author_email="manish@turtlesoftware.co",  # Replace with your email
    description="A flexible role-based access control system for Django applications with tenant user support",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="",  # Leave empty for private package
    project_urls={},  # Leave empty for private package
    packages=['role_management', 'role_management.role_controles'],
    include_package_data=True,
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Framework :: Django",
        "Framework :: Django :: 3.2",
        "Framework :: Django :: 4.0",
        "Framework :: Django :: 4.1",
        "Framework :: Django :: 4.2",
    ],
    license="MIT",
    keywords="django, role, permission, rbac, access-control, authorization",
    python_requires=">=3.6",
    install_requires=[
        "Django>=3.2",
        "djangorestframework>=3.12.0",
    ],
    extras_require={
        'dev': [
            'pytest>=6.0',
            'pytest-django>=4.0',
            'black',
            'isort',
            'flake8',
        ],
    },
)
