from setuptools import setup, find_packages

setup(
    name="own-optimizer",
    version="0.1.0",
    author="Chris",
    description="Biblioteca de orquestração de agentes em 3 camadas baseada no framework Own Optimizer",
    long_description=open("README.md", encoding="utf-8").read() if open("README.md", encoding="utf-8") else "",
    long_description_content_type="text/markdown",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    install_requires=[
        "python-dotenv>=1.0.0",
    ],
)
