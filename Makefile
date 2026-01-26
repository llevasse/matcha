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
	mkdir -p back/uploads/profiles
	npm install --prefix ./front -verbose
	rm -rf ./front/node_modules/ front/package-lock.json
	$(DC) up --build

# Start backend without docker
back:
# 	sudo systemctl start mysql
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
