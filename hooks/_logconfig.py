import logging

def get_logger(name, logging_level=logging.INFO, stream_logging_level=logging.INFO, file_logging_level=logging.INFO, log_file: str = '.workbench/script_build_log.log') -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging_level)
    handler = logging.StreamHandler()
    handler.setLevel(stream_logging_level)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(file_logging_level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger
