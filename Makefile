.PHONY: all clean fclean re down restart back front
# .SILENT:

# **************************************************************************** #
#                                   Variable                                   #
# **************************************************************************** #

NAME	= matcha
DC		= docker compose

# **************************************************************************** #
#                                     Rules                                    #
# **************************************************************************** #

all: $(NAME)

$(NAME):
	if [ ! -f .env ]; then gpg .env.gpg ; fi # todo test this
	mkdir -p back/uploads/profile
# 	mkdir --mode=777 -p t/ # bien verif lors du passage au machine 42
# 	mkdir --mode=777 -p db/ # bien verif lors du passage au machine 42
# 	rm -f db/mysql.sock
	npm install --prefix ./front
	$(DC) up --build

# Start backend without docker
back:
	sudo systemctl start mysql
	cd back && npm install
	cd back && npm start

# Start frontend without docker
front:
	cd front && npm install
	cd front && npm start

down:
	$(DC) down

stop:
	$(DC) stop

restart: down all

clean:
	$(DC) down --volumes --rmi all

fclean: clean
	docker system prune --force --all;

re: fclean all
