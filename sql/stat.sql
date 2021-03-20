USE `belscone_chamber`;
DROP procedure IF EXISTS `STAT`;

DELIMITER $$
USE `belscone_chamber`$$
CREATE PROCEDURE `STAT`()
BEGIN
	DECLARE new_concerts_count INT;
	DECLARE old_concerts_count INT;
    DECLARE news_count INT;
    DECLARE artists_count INT;
    DECLARE composers_count INT;
    DECLARE musicians_count INT;
    SELECT COUNT(*) INTO artists_count from artists;
    SELECT COUNT(*) INTO composers_count from composers;
    SELECT COUNT(*) INTO musicians_count from musicians;
    SELECT COUNT(*) INTO news_count from news;
    SELECT COUNT(*) INTO new_concerts_count from concerts WHERE date>NOW();
    SELECT COUNT(*) INTO old_concerts_count from concerts WHERE date<NOW();
    select new_concerts_count, old_concerts_count, news_count, artists_count, composers_count,musicians_count;
END$$

DELIMITER ;
