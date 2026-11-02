import pytest
from pydantic import ValidationError

from app.config import Settings, get_settings


def test_development_settings_defaults():
    settings = Settings(
        _env_file=None,
        environment="development",
    )
    assert settings.environment == "development"
    assert settings.debug is True
    assert settings.secret_key == "dev-insecure-secret-key-change-in-production"
    assert settings.allowed_hosts == ["*"]
    assert "http://localhost:3000" in settings.cors_origins
    assert settings.cors_allow_credentials is False
    assert settings.is_development is True
    assert settings.is_production is False


def test_production_fails_loudly_when_secret_key_is_unset_or_empty():
    with pytest.raises(ValueError, match="SECRET_KEY must be set"):
        Settings(
            _env_file=None,
            environment="production",
            secret_key="",
        )

    with pytest.raises(ValueError, match="SECRET_KEY must be set"):
        Settings(
            _env_file=None,
            environment="production",
            secret_key="    ",
        )


def test_production_fails_loudly_when_secret_key_is_default_insecure():
    with pytest.raises(ValueError, match="SECRET_KEY must be set"):
        Settings(
            _env_file=None,
            environment="production",
            secret_key="dev-insecure-secret-key-change-in-production",
        )

    with pytest.raises(ValueError, match="SECRET_KEY must be set"):
        Settings(
            _env_file=None,
            environment="production",
            secret_key="changeme",
        )


def test_production_fails_loudly_when_secret_key_is_too_short():
    with pytest.raises(ValueError, match="SECRET_KEY must be set"):
        Settings(
            _env_file=None,
            environment="production",
            secret_key="short-key-123",  # 13 chars (<16)
        )


def test_production_fails_loudly_when_debug_is_true():
    with pytest.raises(ValueError, match="DEBUG must be set to False"):
        Settings(
            _env_file=None,
            environment="production",
            secret_key="valid-secure-production-secret-key-12345",
            debug=True,
        )


def test_production_succeeds_with_valid_secret_and_defaults_debug_false():
    settings = Settings(
        _env_file=None,
        environment="production",
        secret_key="valid-secure-production-secret-key-12345",
    )
    assert settings.environment == "production"
    assert settings.debug is False
    assert settings.secret_key == "valid-secure-production-secret-key-12345"
    assert settings.is_production is True
    assert settings.is_development is False


def test_allowed_hosts_comma_separated_parsing():
    settings = Settings(
        _env_file=None,
        allowed_hosts="api.opensourcemate.com, opensourcemate.com , localhost",
    )
    assert settings.allowed_hosts == [
        "api.opensourcemate.com",
        "opensourcemate.com",
        "localhost",
    ]


def test_allowed_hosts_json_array_parsing():
    settings = Settings(
        _env_file=None,
        allowed_hosts='["api.opensourcemate.com", "opensourcemate.com"]',
    )
    assert settings.allowed_hosts == [
        "api.opensourcemate.com",
        "opensourcemate.com",
    ]


def test_cors_origins_comma_separated_parsing():
    settings = Settings(
        _env_file=None,
        cors_origins="https://app.domain.com, https://preview.domain.com",
    )
    assert settings.cors_origins == [
        "https://app.domain.com",
        "https://preview.domain.com",
    ]


def test_testing_environment_flag():
    settings = Settings(
        _env_file=None,
        environment="testing",
    )
    assert settings.is_testing is True
    assert settings.is_production is False
    assert settings.is_development is False


def test_get_settings_caching():
    get_settings.cache_clear()
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
    get_settings.cache_clear()
