INSERT INTO roles (name)
VALUES ('ADMIN'),
       ('EDITOR'),
       ('VIEWER')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT ur.user_id, nr.id
FROM user_roles ur
         JOIN roles oldr ON oldr.id = ur.role_id
         JOIN roles nr ON nr.name = 'ADMIN'
WHERE oldr.name = 'ROLE_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT ur.user_id, nr.id
FROM user_roles ur
         JOIN roles oldr ON oldr.id = ur.role_id
         JOIN roles nr ON nr.name = 'VIEWER'
WHERE oldr.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

DELETE
FROM user_roles
WHERE role_id IN (SELECT id
                  FROM roles
                  WHERE name IN ('ROLE_ADMIN', 'ROLE_USER'));

DELETE
FROM roles
WHERE name IN ('ROLE_ADMIN', 'ROLE_USER');
